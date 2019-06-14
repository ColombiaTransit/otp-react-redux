/* globals fetch */
import { push } from 'connected-react-router'
import { createAction } from 'redux-actions'
import qs from 'qs'
import moment from 'moment'
import haversine from 'haversine'

import { rememberPlace } from './map'
import { queryIsValid } from '../util/state'
import queryParams from '../util/query-params'
import { getTripOptionsFromQuery, getUrlParams } from '../util/query'
import { hasCar } from '../util/itinerary'
if (typeof (fetch) === 'undefined') require('isomorphic-fetch')

// Generic API actions

export const nonRealtimeRoutingResponse = createAction('NON_REALTIME_ROUTING_RESPONSE')
export const routingRequest = createAction('ROUTING_REQUEST')
export const routingResponse = createAction('ROUTING_RESPONSE')
export const routingError = createAction('ROUTING_ERROR')
export const toggleTracking = createAction('TOGGLE_TRACKING')
export const rememberSearch = createAction('REMEMBER_SEARCH')
export const forgetSearch = createAction('FORGET_SEARCH')

let lastSearchId = 0

function randId () {
  return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(2, 10)
}

function formatRecentPlace (place) {
  return {
    ...place,
    type: 'recent',
    icon: 'clock-o',
    id: `recent-${randId()}`,
    timestamp: new Date().getTime()
  }
}

function formatRecentSearch (url, otpState) {
  return {
    query: getTripOptionsFromQuery(otpState.currentQuery, true),
    url,
    id: randId(),
    timestamp: new Date().getTime()
  }
}

function isStoredPlace (place) {
  return ['home', 'work', 'suggested', 'stop'].indexOf(place.type) !== -1
}

export function routingQuery () {
  return async function (dispatch, getState) {
    const otpState = getState().otp
    const routingType = otpState.currentQuery.routingType
    const searchId = ++lastSearchId

    if (!queryIsValid(otpState)) return
    dispatch(routingRequest({ routingType, searchId }))

    // fetch a realtime route
    const query = constructRoutingQuery(otpState)
    try {
      const realtimeResponse = await fetch(constructRoutingQuery(otpState))
      const realtimeJson = await getJsonAndCheckResponse(realtimeResponse)
      await dispatch(routingResponse({ response: realtimeJson, searchId }))
      // If tracking is enabled, store locations and search after successful
      // search is completed.
      // TODO recent searches
      if (otpState.user.trackRecent) {
        const { from, to } = otpState.currentQuery
        if (!isStoredPlace(from)) {
          dispatch(rememberPlace({ type: 'recent', location: formatRecentPlace(from) }))
        }
        if (!isStoredPlace(to)) {
          dispatch(rememberPlace({ type: 'recent', location: formatRecentPlace(to) }))
        }
        dispatch(rememberSearch(formatRecentSearch(query, otpState)))
      }
    } catch (error) {
      dispatch(routingError({ error, searchId }))
    }

    // also fetch a non-realtime route
    const params = getRoutingParams(otpState, true)
    dispatch(updateOtpUrlParams(params))
    try {
      const staticResponse = await fetch(constructRoutingQuery(otpState, true))
      const staticJson = await getJsonAndCheckResponse(staticResponse)
      await dispatch(nonRealtimeRoutingResponse({ response: staticJson, searchId }))
    } catch (error) {
      console.error(error)
    }
  }
}

function getJsonAndCheckResponse (res) {
  if (res.status >= 400) {
    const error = new Error('Received error from server')
    error.response = res
    throw error
  }
  return res.json()
}

function constructRoutingQuery (otpState, ignoreRealtimeUpdates) {
  const { config, currentQuery } = otpState
  const routingType = currentQuery.routingType
  // Check for routingType-specific API config; if none, use default API
  const rt = config.routingTypes && config.routingTypes.find(rt => rt.key === routingType)
  const api = (rt && rt.api) || config.api
  const planEndpoint = `${api.host}${api.port
    ? ':' + api.port
    : ''}${api.path}/plan`
  const params = getRoutingParams(otpState, ignoreRealtimeUpdates)
  return `${planEndpoint}?${qs.stringify(params)}`
}

function getRoutingParams (otpState, ignoreRealtimeUpdates) {
  const { config, currentQuery } = otpState
  const routingType = currentQuery.routingType
  const isItinerary = routingType === 'ITINERARY'
  let params = {}

  // Start with the universe of OTP parameters defined in query-params.js:
  queryParams
    .filter(qp => {
      // A given parameter is included in the request if all of the following:
      // 1. Must apply to the active routing type (ITINERARY or PROFILE)
      // 2. Must be included in the current user-defined query
      // 3. Must pass the parameter's applicability test, if one is specified
      return qp.routingTypes.indexOf(routingType) !== -1 &&
        qp.name in currentQuery &&
        (typeof qp.applicable !== 'function' || qp.applicable(currentQuery, config))
    })
    .forEach(qp => {
      // Translate the applicable parameters according to their rewrite
      // functions (if provided)
      const rewriteFunction = isItinerary
        ? qp.itineraryRewrite
        : qp.profileRewrite
      params = Object.assign(
        params,
        rewriteFunction
          ? rewriteFunction(currentQuery[qp.name])
          : { [qp.name]: currentQuery[qp.name] }
      )
    })

  // Additional processing specific to ITINERARY mode
  if (isItinerary) {
    // override ignoreRealtimeUpdates if provided
    if (typeof ignoreRealtimeUpdates === 'boolean') {
      params.ignoreRealtimeUpdates = ignoreRealtimeUpdates
    }

    // check date/time validity; ignore both if either is invalid
    const dateValid = moment(params.date, 'YYYY-MM-DD').isValid()
    const timeValid = moment(params.time, 'H:mm').isValid()

    if (!dateValid || !timeValid) {
      delete params.time
      delete params.date
    }

    // temp: set additional parameters for CAR_HAIL or CAR_RENT trips
    if (
      params.mode &&
      (params.mode.includes('CAR_HAIL') || params.mode.includes('CAR_RENT'))
    ) {
      params.minTransitDistance = '50%'
      // increase search timeout because these queries can take a while
      params.searchTimeout = 10000
    }

    // set onlyTransitTrips for car rental searches
    if (params.mode && params.mode.includes('CAR_RENT')) {
      params.onlyTransitTrips = true
    }

  // Additional processing specific to PROFILE mode
  } else {
    // check start and end time validity; ignore both if either is invalid
    const startTimeValid = moment(params.startTime, 'H:mm').isValid()
    const endTimeValid = moment(params.endTime, 'H:mm').isValid()

    if (!startTimeValid || !endTimeValid) {
      delete params.startTimeValid
      delete params.endTimeValid
    }
  }

  // TODO: check that valid from/to locations are provided

  // hack to add walking to driving/TNC trips
  if (hasCar(params.mode)) {
    params.mode += ',WALK'
  }

  return params
}

// Park and Ride location query

export const parkAndRideError = createAction('PARK_AND_RIDE_ERROR')
export const parkAndRideResponse = createAction('PARK_AND_RIDE_RESPONSE')

export function parkAndRideQuery (params) {
  let endpoint = 'park_and_ride'
  if (params && Object.keys(params).length > 0) {
    endpoint += '?' + Object.keys(params).map(key => key + '=' + params[key]).join('&')
  }
  return createQueryAction(endpoint, parkAndRideResponse, parkAndRideError)
}

// bike rental station query

export const bikeRentalError = createAction('BIKE_RENTAL_ERROR')
export const bikeRentalResponse = createAction('BIKE_RENTAL_RESPONSE')

export function bikeRentalQuery (params) {
  return createQueryAction('bike_rental', bikeRentalResponse, bikeRentalError)
}

// Car rental (e.g. car2go) locations lookup query

export const carRentalResponse = createAction('CAR_RENTAL_RESPONSE')
export const carRentalError = createAction('CAR_RENTAL_ERROR')

export function carRentalQuery (params) {
  return createQueryAction('car_rental', carRentalResponse, carRentalError)
}

// Vehicle rental (e.g. Lime eScooter) locations lookup query

export const vehicleRentalResponse = createAction('VEHICLE_RENTAL_RESPONSE')
export const vehicleRentalError = createAction('VEHICLE_RENTAL_ERROR')

export function vehicleRentalQuery (params) {
  return createQueryAction('vehicle_rental', vehicleRentalResponse, vehicleRentalError)
}

// Single stop lookup query

// Stop times for stop query
// TODO: make timeRange and numberOfDepartures configurable
export const findStopResponse = createAction('FIND_STOP_RESPONSE')
export const findStopError = createAction('FIND_STOP_ERROR')

export function findStop (params) {
  const query = `
query stopQuery($stopId: [String]) {
  stops (ids: $stopId) {
    id: gtfsId
    code
    name
    url
    lat
    lon
    stoptimesForPatterns {
      pattern {
        id: semanticHash
        route {
          id: gtfsId
          longName
          shortName
          sortOrder
        }
      }
      stoptimes {
        scheduledArrival
        realtimeArrival
        arrivalDelay
        scheduledDeparture
        realtimeDeparture
        departureDelay
        timepoint
        realtime
        realtimeState
        serviceDay
        headsign
      }
    }
  }
}
`
  return createGraphQLQueryAction(
    query,
    { stopId: params.stopId },
    findStopResponse,
    findStopError,
    {
      serviceId: 'stops',
      rewritePayload: (payload) => {
        // convert pattern array to ID-mapped object
        const patterns = []
        const { stoptimesForPatterns, ...stop } = payload.data.stops[0]
        stoptimesForPatterns.forEach(obj => {
          const { pattern, stoptimes: stopTimes } = obj
          // It's possible that not all stop times for a pattern will share the
          // same headsign, but this is probably a minor edge case.
          const headsign = stopTimes[0]
            ? stopTimes[0].headsign
            : pattern.route.longName
          const patternIndex = patterns.findIndex(p =>
            p.headsign === headsign && pattern.route.id === p.route.id)
          if (patternIndex === -1) {
            patterns.push({ ...pattern, headsign, stopTimes })
          } else {
            patterns[patternIndex].stopTimes.push(...stopTimes)
          }
        })
        return {
          ...stop,
          patterns
        }
      }
    }
  )
}

// Single trip lookup query

export const findTripResponse = createAction('FIND_TRIP_RESPONSE')
export const findTripError = createAction('FIND_TRIP_ERROR')

export function findTrip (params) {
  return createQueryAction(
    `index/trips/${params.tripId}`,
    findTripResponse,
    findTripError,
    {
      postprocess: (payload, dispatch) => {
        dispatch(findStopsForTrip({tripId: params.tripId}))
        dispatch(findStopTimesForTrip({tripId: params.tripId}))
        dispatch(findGeometryForTrip({tripId: params.tripId}))
      }
    }
  )
}

// Stops for trip query

export const findStopsForTripResponse = createAction('FIND_STOPS_FOR_TRIP_RESPONSE')
export const findStopsForTripError = createAction('FIND_STOPS_FOR_TRIP_ERROR')

export function findStopsForTrip (params) {
  return createQueryAction(
    `index/trips/${params.tripId}/stops`,
    findStopsForTripResponse,
    findStopsForTripError,
    {
      rewritePayload: (payload) => {
        return {
          tripId: params.tripId,
          stops: payload
        }
      }
    }
  )
}

// Stop times for trip query

export const findStopTimesForTripResponse = createAction('FIND_STOP_TIMES_FOR_TRIP_RESPONSE')
export const findStopTimesForTripError = createAction('FIND_STOP_TIMES_FOR_TRIP_ERROR')

export function findStopTimesForTrip (params) {
  return createQueryAction(
    `index/trips/${params.tripId}/stoptimes`,
    findStopTimesForTripResponse,
    findStopTimesForTripError,
    {
      rewritePayload: (payload) => {
        return {
          tripId: params.tripId,
          stopTimes: payload
        }
      }
    }
  )
}

// Geometry for trip query

export const findGeometryForTripResponse = createAction('FIND_GEOMETRY_FOR_TRIP_RESPONSE')
export const findGeometryForTripError = createAction('FIND_GEOMETRY_FOR_TRIP_ERROR')

export function findGeometryForTrip (params) {
  return createQueryAction(`index/trips/${params.tripId}/geometry`,
    findGeometryForTripResponse, findGeometryForTripError,
    (payload) => {
      return {
        tripId: params.tripId,
        geometry: payload
      }
    }
  )
}

// Routes lookup query

export const findRoutesResponse = createAction('FIND_ROUTES_RESPONSE')
export const findRoutesError = createAction('FIND_ROUTES_ERROR')

export function findRoutes (params) {
  const query = `
{
  routes {
    id: gtfsId
    color
    longName
    shortName
    mode
    type
    desc
    bikesAllowed
    sortOrder
    textColor
    url
    agency {
      id: gtfsId
      name
      url
    }
  }
}
  `
  return createGraphQLQueryAction(
    query,
    {},
    findRoutesResponse,
    findRoutesError,
    {
      serviceId: 'routes',
      rewritePayload: (payload) => {
        const routes = {}
        payload.data.routes.forEach(rte => { routes[rte.id] = rte })
        return routes
      }
    }
  )
}

// Patterns for Route lookup query
// TODO: replace with GraphQL query for route => patterns => geometry
export const findPatternsForRouteResponse = createAction('FIND_PATTERNS_FOR_ROUTE_RESPONSE')
export const findPatternsForRouteError = createAction('FIND_PATTERNS_FOR_ROUTE_ERROR')

export function findRoute (params) {
  const query = `
  query routeQuery($routeId: [String]) {
    routes (ids: $routeId) {
      id: gtfsId
      patterns {
        id: semanticHash
        directionId
        headsign
        name
        semanticHash
        geometry {
          lat
          lon
        }
      }
    }
  }
  `
  return createGraphQLQueryAction(
    query,
    { routeId: params.routeId },
    findPatternsForRouteResponse,
    findPatternsForRouteError,
    {
      rewritePayload: (payload) => {
        // convert pattern array to ID-mapped object
        const patterns = {}
        payload.data.routes[0].patterns.forEach(ptn => {
          patterns[ptn.id] = {
            routeId: params.routeId,
            patternId: ptn.id,
            geometry: ptn.geometry
          }
        })

        return {
          routeId: params.routeId,
          patterns
        }
      }
    }
  )
}

// TNC ETA estimate lookup query

export const transportationNetworkCompanyEtaResponse = createAction('TNC_ETA_RESPONSE')
export const transportationNetworkCompanyEtaError = createAction('TNC_ETA_ERROR')

export function getTransportationNetworkCompanyEtaEstimate (params) {
  const {companies, from} = params
  return createQueryAction(
    `transportation_network_company/eta_estimate?${qs.stringify({
      companies,
      from
    })}`, // endpoint
    transportationNetworkCompanyEtaResponse, // responseAction
    transportationNetworkCompanyEtaError, // errorAction
    {
      rewritePayload: (payload) => {
        return {
          from,
          estimates: payload.estimates
        }
      }
    }
  )
}

// TNC ride estimate lookup query

export const transportationNetworkCompanyRideResponse = createAction('TNC_RIDE_RESPONSE')
export const transportationNetworkCompanyRideError = createAction('TNC_RIDE_ERROR')

export function getTransportationNetworkCompanyRideEstimate (params) {
  const {company, from, rideType, to} = params
  return createQueryAction(
    `transportation_network_company/ride_estimate?${qs.stringify({
      company,
      from,
      rideType,
      to
    })}`, // endpoint
    transportationNetworkCompanyRideResponse, // responseAction
    transportationNetworkCompanyRideError, // errorAction
    {
      rewritePayload: (payload) => {
        return {
          company,
          from,
          rideEstimate: payload.rideEstimate,
          to
        }
      }
    }
  )
}

// Nearby Stops Query

const receivedNearbyStopsResponse = createAction('NEARBY_STOPS_RESPONSE')
const receivedNearbyStopsError = createAction('NEARBY_STOPS_ERROR')

export function findNearbyStops (params) {
  return createQueryAction(
    `index/stops?${qs.stringify({radius: 1000, ...params})}`,
    receivedNearbyStopsResponse,
    receivedNearbyStopsError,
    {
      serviceId: 'stops',
      rewritePayload: stops => {
        if (stops) {
          // Sort the stops by proximity
          stops.forEach(stop => {
            stop.distance = haversine(
              { latitude: params.lat, longitude: params.lon },
              { latitude: stop.lat, longitude: stop.lon }
            )
          })
          stops.sort((a, b) => { return a.distance - b.distance })
          if (params.max && stops.length > params.max) stops = stops.slice(0, params.max)
        }
        return {stops}
      },
      // retrieve routes for each stop
      postprocess: (stops, dispatch, getState) => {
        if (params.max && stops.length > params.max) stops = stops.slice(0, params.max)
        stops.forEach(stop => dispatch(findRoutesAtStop(stop.id)))
      }
    }
  )
}

// Routes at Stop query

const receivedRoutesAtStopResponse = createAction('ROUTES_AT_STOP_RESPONSE')
const receivedRoutesAtStopError = createAction('ROUTES_AT_STOP_ERROR')

export function findRoutesAtStop (stopId) {
  return createQueryAction(
    `index/stops/${stopId}/routes`,
    receivedRoutesAtStopResponse,
    receivedRoutesAtStopError,
    {
      serviceId: 'stops/routes',
      rewritePayload: routes => ({stopId, routes})
    }
  )
}

// Stops within Bounding Box Query

const receivedStopsWithinBBoxResponse = createAction('STOPS_WITHIN_BBOX_RESPONSE')
const receivedStopsWithinBBoxError = createAction('STOPS_WITHIN_BBOX_ERROR')

export function findStopsWithinBBox (params) {
  return createQueryAction(
    `index/stops?${qs.stringify(params)}`,
    receivedStopsWithinBBoxResponse,
    receivedStopsWithinBBoxError,
    {
      serviceId: 'stops',
      rewritePayload: stops => ({stops})
    }
  )
}

export const clearStops = createAction('CLEAR_STOPS_OVERLAY')

const throttledUrls = {}

function now () {
  return (new Date()).getTime()
}

const TEN_SECONDS = 10000

// automatically clear throttled urls older than 10 seconds
setInterval(() => {
  Object.keys(throttledUrls).forEach(key => {
    if (throttledUrls[key] < now() - TEN_SECONDS) {
      delete throttledUrls[key]
    }
  })
}, 1000)

/**
 * Generic helper for constructing API queries. Automatically throttles queries
 * to url to no more than once per 10 seconds.
 *
 * @param {string} endpoint - The API endpoint path (does not include
 *   '../otp/routers/router_id/')
 * @param {Function} responseAction - Action to dispatch on a successful API
 *   response. Accepts payload object parameter.
 * @param {Function} errorAction - Function to invoke on API error response.
 *   Accepts error object parameter.
 * @param {Options} options - Any of the following optional settings:
 *   - rewritePayload: Function to be invoked to modify payload before being
 *       passed to responseAction. Accepts and returns payload object.
 *   - postprocess: Function to be invoked after responseAction is invoked.
 *       Accepts payload, dispatch, getState parameters.
 *   - serviceId: identifier for TransitIndex service used in
 *       alternateTransitIndex configuration.
 *   - fetchOptions: fetch options (e.g., method, body, headers).
 */

function createQueryAction (endpoint, responseAction, errorAction, options = {}) {
  return async function (dispatch, getState) {
    const otpState = getState().otp
    let url
    if (options.serviceId && otpState.config.alternateTransitIndex &&
      otpState.config.alternateTransitIndex.services.includes(options.serviceId)
    ) {
      console.log('Using alt service for ' + options.serviceId)
      url = otpState.config.alternateTransitIndex.apiRoot + endpoint
    } else {
      const api = otpState.config.api
      url = `${api.host}${api.port ? ':' + api.port : ''}${api.path}/${endpoint}`
    }

    // don't make a request to a URL that has already seen the same request
    // within the last 10 seconds
    if (throttledUrls[url] && throttledUrls[url] > now() - TEN_SECONDS) {
      // URL already had a request within last 10 seconds, exit
      return
    } else {
      throttledUrls[url] = now()
    }
    let payload
    try {
      const response = await fetch(url, options.fetchOptions)
      if (response.status >= 400) {
        const error = new Error('Received error from server')
        error.response = response
        throw error
      }
      payload = await response.json()
    } catch (err) {
      return dispatch(errorAction(err))
    }

    if (typeof options.rewritePayload === 'function') {
      dispatch(responseAction(options.rewritePayload(payload)))
    } else {
      dispatch(responseAction(payload))
    }

    if (typeof options.postprocess === 'function') {
      options.postprocess(payload, dispatch, getState)
    }
  }
}

function createGraphQLQueryAction (query, variables, responseAction, errorAction, options) {
  const endpoint = `index/graphql`
  const fetchOptions = {
    method: 'POST',
    body: JSON.stringify({ query, variables }),
    headers: { 'Content-Type': 'application/json' }
  }
  return createQueryAction(
    endpoint,
    responseAction,
    errorAction,
    { ...options, fetchOptions }
  )
}

/**
 * Update the UI-state parameters in the URL. Leaves any other existing URL
 * parameters unchanged.
 */
export function updateUiUrlParams (uiParams) {
  return function (dispatch, getState) {
    const otpParams = {}
    // Get all non-OTP params, which will be retained unchanged in the URL
    const urlParams = getUrlParams()
    Object.keys(urlParams)
      .filter(key => !key.startsWith('ui_'))
      .forEach(key => { otpParams[key] = urlParams[key] })
    // Merge in the provided UI params and update the URL
    dispatch(setUrlSearch(Object.assign(otpParams, uiParams)))
  }
}

/**
 * Update the browser/URL history with new parameters
 * NOTE: This has not been tested for profile-based journeys.
 * FIXME: Should we be using react-router-redux for this?
 */
export function setUrlSearch (params) {
  return function (dispatch, getState) {
    const base = getState().router.location.pathname
    dispatch(push(`${base}?${qs.stringify(params)}`))
  }
}

/**
 * Update the OTP Query parameters in the URL. Leaves any other existing URL
 * parameters unchanged.
 */
export function updateOtpUrlParams (otpParams) {
  return function (dispatch, getState) {
    const params = {}
    // Get all OTP-specific params, which will be retained unchanged in the URL
    const urlParams = getUrlParams()
    Object.keys(urlParams)
      .filter(key => key.indexOf('_') !== -1)
      .forEach(key => { params[key] = urlParams[key] })
    // Merge in the provided OTP params and update the URL
    dispatch(setUrlSearch(Object.assign(params, otpParams)))
  }
}
