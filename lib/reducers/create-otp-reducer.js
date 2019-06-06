import clone from 'clone'
import update from 'immutability-helper'
import isEqual from 'lodash.isequal'

import {
  ensureSingleAccessMode,
  getDefaultQuery,
  getJSONFromStorage,
  getUrlParams
} from '../util/query'
import { isTransit, getTransitModes } from '../util/itinerary'
import { filterProfileOptions } from '../util/profile'
import { MobileScreens } from '../actions/ui'

const defaultConfig = {
  autoPlan: false,
  debouncePlanTimeMs: 0,
  realtimeEffectsDisplayThreshold: 120,
  operators: []
}

// Load user override settings from local storage.
// TODO: Make this work with settings fetched from user profile API service.
const options = getJSONFromStorage('otp.defaultQuery')
const defaultQuery = Object.assign(getDefaultQuery(), options)
const home = getJSONFromStorage('otp.home', true)
const work = getJSONFromStorage('otp.work', true)
const trackRecent = getJSONFromStorage('otp.trackRecent', true) || false
const recentPlaces = getJSONFromStorage('otp.recent', true) || []
const recentSearches = getJSONFromStorage('otp.recentSearches', true) || []
const locations = [home, work, ...recentPlaces].filter(p => p)
// TODO: parse and merge URL query params w/ default query

// TODO: fire planTrip action if default query is complete/error-free

function createOtpReducer (config, initialQuery) {
  // populate query by merging any provided query params w/ the default params
  const currentQuery = Object.assign(defaultQuery, initialQuery)
  if (config.locations) {
    locations.push(...config.locations.map(l => ({ ...l, type: 'suggested' })))
  }
  let queryModes = currentQuery.mode.split(',')

  // If 'TRANSIT' is included in the mode list, replace it with individual modes
  if (queryModes.includes('TRANSIT')) {
    // Isolate the non-transit modes in queryModes
    queryModes = queryModes.filter(m => !isTransit(m))
    // Add all possible transit modes
    queryModes = queryModes.concat(getTransitModes(config))
    // Stringify and set as OTP 'mode' query param
    currentQuery.mode = queryModes.join(',')
  }

  // If we are in 'ITINERARY' mode, ensure that one and only one access mode is selected
  if (currentQuery.routingType === 'ITINERARY') {
    queryModes = ensureSingleAccessMode(queryModes)
  }

  const initialState = {
    config: Object.assign(defaultConfig, config),
    currentQuery,
    location: {
      currentPosition: {
        error: null,
        coords: null,
        fetching: false
      },
      sessionSearches: [],
      nearbyStops: []
    },
    user: {
      trackRecent,
      locations,
      recentSearches
    },
    searches: {},
    transitIndex: {
      stops: {},
      trips: {}
    },
    useRealtime: true,
    activeSearchId: 0,
    overlay: {
      bikeRental: {
        stations: []
      },
      carRental: {
        stations: []
      },
      parkAndRide: {
        // null default value indicates no request for P&R list has been made
        locations: null
      },
      transit: {
        stops: []
      },
      transitive: null,
      zipcar: {
        locations: []
      }
    },
    tnc: {
      etaEstimates: {},
      rideEstimates: {}
    },
    ui: {
      mobileScreen: MobileScreens.WELCOME_SCREEN,
      printView: window.location.href.indexOf('/print/') !== -1,
      diagramLeg: null
    }
  }

  return (state = initialState, action) => {
    const searchId = action.payload && action.payload.searchId
    switch (action.type) {
      case 'ROUTING_REQUEST':
        // Compute the initial activeItinerary. If this is the first search of
        // session (i.e. searches lookup is empty/null) AND an activeItinerary ID
        // is specified in URL parameters, use that ID. Otherwise, use null/0
        let activeItinerary = state.currentQuery.routingType === 'ITINERARY' ? 0 : null
        // We cannot use window.history.state here to check for the active
        // itinerary param because it is unreliable in some states (e.g.,
        // when the print layout component first loads).
        const urlParams = getUrlParams()
        if (
          (!state.searches || Object.keys(state.searches).length === 0) &&
          urlParams.ui_activeItinerary
        ) {
          activeItinerary = +urlParams.ui_activeItinerary
        }

        return update(state, {
          searches: {
            [searchId]: {
              $set: {
                activeItinerary,
                activeLeg: null,
                activeStep: null,
                pending: true,
                query: clone(state.currentQuery),
                response: null
              }
            }
          },
          activeSearchId: { $set: searchId }
        })
      case 'ROUTING_ERROR':
        return update(state, {
          searches: {
            [searchId]: {
              response: {
                $set: {
                  error: action.payload.error
                }
              },
              pending: { $set: false }
            }
          }
        })
      case 'ROUTING_RESPONSE':
        const response = (state.currentQuery.routingType === 'PROFILE')
          ? filterProfileOptions(action.payload.response)
          : action.payload.response

        return update(state, {
          searches: {
            [searchId]: {
              response: { $set: response },
              pending: { $set: false }
            }
          },
          ui: {
            diagramLeg: { $set: false }
          }
        })
      case 'NON_REALTIME_ROUTING_RESPONSE':
        return update(state, {
          searches: {
            [searchId]: {
              nonRealtimeResponse: { $set: action.payload.response }
            }
          }
        })
      case 'BIKE_RENTAL_REQUEST':
        return update(state, {
          overlay: {
            bikeRental: {
              pending: { $set: true },
              error: { $set: null }
            }
          }
        })
      case 'BIKE_RENTAL_ERROR':
        return update(state, {
          overlay: {
            bikeRental: {
              pending: { $set: false },
              error: { $set: action.payload }
            }
          }
        })
      case 'BIKE_RENTAL_RESPONSE':
        return update(state, {
          overlay: {
            bikeRental: {
              stations: { $set: action.payload.stations },
              pending: { $set: false }
            }
          }
        })
      case 'CAR_RENTAL_ERROR':
        return update(state, {
          overlay: {
            carRental: {
              pending: { $set: false },
              error: { $set: action.payload }
            }
          }
        })
      case 'CAR_RENTAL_RESPONSE':
        return update(state, {
          overlay: {
            carRental: {
              stations: { $set: action.payload.stations },
              pending: { $set: false }
            }
          }
        })
      case 'SET_USE_REALTIME_RESPONSE':
        return update(state, {
          useRealtime: { $set: action.payload.useRealtime }
        })
      case 'SET_ACTIVE_ITINERARY':
        if (state.activeSearchId !== null) {
          return update(state, {
            searches: {
              [state.activeSearchId]: {
                activeItinerary: { $set: action.payload.index },
                activeLeg: { $set: null },
                activeStep: { $set: null }
              }
            }
          })
        }
        return state
      case 'SET_ACTIVE_LEG':
        if (state.activeSearchId !== null) {
          return update(state, {
            searches: {
              [state.activeSearchId]: {
                activeLeg: { $set: action.payload.index },
                activeStep: { $set: null }
              }
            }
          })
        }
        return state
      case 'SET_ACTIVE_STEP':
        if (state.activeSearchId !== null) {
          return update(state, {
            searches: {
              [state.activeSearchId]: {
                activeStep: { $set: action.payload.index }
              }
            }
          })
        }
        return state
      case 'SET_LOCATION':
        return update(state, {
          currentQuery: {
            [action.payload.type]: { $set: action.payload.location }
          }
        })
      case 'CLEAR_LOCATION':
        return update(state, {
          currentQuery: { [action.payload.type]: { $set: null } }
        })

      case 'SET_QUERY_PARAM':
        console.log('merging QPs', action.payload)
        return update(state, { currentQuery: { $merge: action.payload } })

      case 'CLEAR_ACTIVE_SEARCH':
        return update(state, { activeSearchId: { $set: null } })
      case 'CLEAR_DEFAULT_SETTINGS':
        window.localStorage.removeItem('otp.defaultQuery')
        return update(state, { defaults: { $set: null } })
      case 'STORE_DEFAULT_SETTINGS':
        window.localStorage.setItem('otp.defaultQuery', JSON.stringify(action.payload))
        return update(state, { defaults: { $set: action.payload } })
      case 'FORGET_PLACE': {
        const locations = clone(state.user.locations)
        const locationIndex = locations.findIndex(l => l.id === action.payload)
        if (action.payload.indexOf('recent') !== -1) {
          // Remove recent from list of recent places
          const recentPlaces = locations.filter(l => l.type === 'recent')
          const removeIndex = recentPlaces.findIndex(l => l.id === action.payload)
          recentPlaces.splice(removeIndex, 1)
          window.localStorage.setItem(`otp.recent`, JSON.stringify(recentPlaces))
        } else {
          window.localStorage.removeItem(`otp.${action.payload}`)
        }
        return locationIndex !== -1
          ? update(state, { user: { locations: { $splice: [[locationIndex, 1]] } } })
          : state
      }
      case 'TOGGLE_TRACKING': {
        window.localStorage.setItem('otp.trackRecent', JSON.stringify(action.payload))
        let locations = clone(state.user.locations)
        if (!action.payload) {
          // If user disables tracking, remove recent searches and locations.
          locations = locations.filter(l => l.type !== 'recent')
          window.localStorage.removeItem(`otp.recent`)
          window.localStorage.removeItem(`otp.recentSearches`)
        }
        return update(state, { user: {
          trackRecent: { $set: action.payload },
          locations: { $set: locations },
          recentSearches: { $set: [] }
        } })
      }
      case 'REMEMBER_PLACE': {
        const { location, type } = action.payload
        const locations = clone(state.user.locations)
        const duplicateIndex = locations.findIndex(l => l.lat === location.lat && l.lon === location.lon)
        let locationsUpdate
        if (location.type === 'recent') {
          let firstIndex = -1
          let lastIndex = -1
          locations.forEach((l, i) => {
            if (l.type === 'recent') {
              if (firstIndex === -1) firstIndex = i
              else lastIndex = i
            }
          })
          const recentPlaces = locations.filter(l => l.type === 'recent')
          if (duplicateIndex !== -1) {
            // If duplicate index found for a recent place, do not store recent
            // place (no state change)
            return state
          }
          // Only keep up to 5 recent locations
          // FIXME: Check for duplicates
          if (recentPlaces.length >= 5) {
            recentPlaces.splice(lastIndex, 1, location)
            locationsUpdate = { $splice: [[lastIndex, 1, location]] }
          } else {
            recentPlaces.push(location)
            locationsUpdate = { $push: [location] }
          }
          window.localStorage.setItem(`otp.recent`, JSON.stringify(recentPlaces))
        } else {
          if (duplicateIndex !== -1) {
            // If a duplicate place was found for a home/work location, that's
            // not a problem
          }
          // Determine if location type already exists in list
          const index = locations.findIndex(l => l.type === type)
          if (index !== -1) {
            locationsUpdate = { $splice: [[index, 1, location]] }
          } else {
            locationsUpdate = { $push: [location] }
          }
          window.localStorage.setItem(`otp.${type}`, JSON.stringify(location))
        }
        return update(state, { user: { locations: locationsUpdate } })
      }
      case 'REMEMBER_SEARCH':
        const searches = clone(state.user.recentSearches)
        const duplicateIndex = searches.findIndex(s => isEqual(s.query, action.payload.query))
        // Do not store a duplicate search
        if (duplicateIndex !== -1) {
          return state
        }
        searches.push(action.payload)
        window.localStorage.setItem(`otp.recentSearches`, JSON.stringify(searches))
        return update(state, { user: { searches: { $set: searches } } })
      case 'FORGET_SEARCH': {
        const recentSearches = clone(state.user.recentSearches)
        const index = recentSearches.findIndex(l => l.id === action.payload)
        // Remove item from list of recent searches
        recentSearches.splice(index, 1)
        window.localStorage.setItem(`otp.recentSearches`, JSON.stringify(recentSearches))
        return index !== -1
          ? update(state, { user: { recentSearches: { $splice: [[index, 1]] } } })
          : state
      }
      case 'SET_AUTOPLAN':
        return update(state, {
          config: { autoPlan: { $set: action.payload.autoPlan } }
        })
      case 'SET_MAP_CENTER':
        return update(state, {
          config: {
            map: {
              initLat: { $set: action.payload.lat },
              initLon: { $set: action.payload.lon }
            }
          }
        })
      case 'SET_MAP_ZOOM':
        return update(state, {
          config: {
            map: {
              initZoom: { $set: action.payload.zoom }
            }
          }
        })
      case 'SHOW_LEG_DIAGRAM':
        return update(state, {
          ui: {
            diagramLeg: { $set: action.payload }
          }
        })
      case 'SET_ELEVATION_POINT':
        return update(state, {
          ui: {
            elevationPoint: { $set: action.payload }
          }
        })
      case 'SET_MAP_POPUP_LOCATION':
        return update(state, {
          ui: {
            mapPopupLocation: { $set: action.payload.location }
          }
        })
      case 'POSITION_FETCHING':
        return update(state, {
          location: {
            currentPosition: { $merge: { fetching: action.payload.type } }
          }
        })
      case 'POSITION_ERROR':
        return update(state, {
          location: { currentPosition: { $set: action.payload } }
        })
      case 'POSITION_RESPONSE':
        return update(state, {
          location: { currentPosition: { $set: action.payload.position } }
        })
      case 'ADD_LOCATION_SEARCH':
        return update(state, {
          location: { sessionSearches: { $unshift: [action.payload.location] } }
        })

      case 'NEARBY_STOPS_RESPONSE':
        const stopLookup = {}
        action.payload.stops.forEach(s => {
          stopLookup[s.id] = s
        })
        return update(state, {
          location: {
            nearbyStops: { $set: action.payload.stops.map(s => s.id) }
          },
          transitIndex: { stops: { $merge: stopLookup } }
        })
      case 'STOPS_WITHIN_BBOX_RESPONSE':
        return update(state, {
          overlay: {
            transit: {
              stops: { $set: action.payload.stops },
              pending: { $set: false }
            }
          }
        })
      case 'CLEAR_STOPS_OVERLAY':
        return update(state, {
          overlay: {
            transit: {
              stops: { $set: [] },
              pending: { $set: false }
            }
          }
        })
      case 'ROUTES_AT_STOP_RESPONSE':
        return update(state, {
          transitIndex: {
            stops: {
              [action.payload.stopId]: {
                routes: { $set: action.payload.routes }
              }
            }
          }
        })
      case 'SET_MOBILE_SCREEN':
        return update(state, { ui: { mobileScreen: { $set: action.payload } } })
      case 'SET_MAIN_PANEL_CONTENT':
        return update(state, {
          ui: { mainPanelContent: { $set: action.payload } }
        })
      case 'SET_VIEWED_STOP':
        return update(state, { ui: { viewedStop: { $set: action.payload } } })
      case 'CLEAR_VIEWED_STOP':
        return update(state, { ui: { viewedStop: { $set: null } } })

      case 'SET_VIEWED_TRIP':
        return update(state, { ui: { viewedTrip: { $set: action.payload } } })
      case 'CLEAR_VIEWED_TRIP':
        return update(state, { ui: { viewedTrip: { $set: null } } })

      case 'SET_VIEWED_ROUTE':
        return update(state, { ui: { viewedRoute: { $set: action.payload } } })

      case 'FIND_STOP_RESPONSE':
        return update(state, {
          transitIndex: {
            stops: { [action.payload.id]: { $set: action.payload } }
          }
        })
      case 'FIND_TRIP_RESPONSE':
        return update(state, {
          transitIndex: {
            trips: { [action.payload.id]: { $set: action.payload } }
          }
        })
      case 'FIND_STOPS_FOR_TRIP_RESPONSE':
        return update(state, {
          transitIndex: {
            trips: {
              [action.payload.tripId]: { stops: { $set: action.payload.stops } }
            }
          }
        })
      case 'FIND_STOP_TIMES_FOR_TRIP_RESPONSE':
        return update(state, {
          transitIndex: {
            trips: {
              [action.payload.tripId]: {
                stopTimes: { $set: action.payload.stopTimes }
              }
            }
          }
        })
      case 'FIND_GEOMETRY_FOR_TRIP_RESPONSE':
        return update(state, {
          transitIndex: {
            trips: {
              [action.payload.tripId]: {
                geometry: { $set: action.payload.geometry }
              }
            }
          }
        })
      case 'FIND_STOP_TIMES_FOR_STOP_RESPONSE':
        return update(state, {
          transitIndex: {
            stops: {
              [action.payload.stopId]: {
                stopTimes: { $set: action.payload.stopTimes }
              }
            }
          }
        })

      case 'FIND_ROUTES_RESPONSE':
        // If routes is undefined, initialize it w/ the full payload
        if (!state.transitIndex.routes) {
          return update(state, {
            transitIndex: { routes: { $set: action.payload } }
          })
        }
        // Otherwise, merge in only the routes not already defined
        const currentRouteIds = Object.keys(state.transitIndex.routes)
        const newRoutes = Object.keys(action.payload)
          .filter(key => !currentRouteIds.includes(key))
          .reduce((res, key) => Object.assign(res, { [key]: action.payload[key] }), {})
        return update(state, {
          transitIndex: { routes: { $merge: newRoutes } }
        })

      case 'FIND_ROUTE_RESPONSE':
        // If routes is undefined, initialize it w/ this route only
        if (!state.transitIndex.routes) {
          return update(state, {
            transitIndex: { routes: { $set: { [action.payload.id]: action.payload } } }
          })
        }
        // Otherwise, overwrite only this route
        return update(state, {
          transitIndex: {
            routes: { [action.payload.id]: { $set: action.payload } }
          }
        })

      case 'FIND_PATTERNS_FOR_ROUTE_RESPONSE':
        return update(state, {
          transitIndex: {
            routes: {
              [action.payload.routeId]: {
                patterns: { $set: action.payload.patterns }
              }
            }
          }
        })
      case 'FIND_GEOMETRY_FOR_PATTERN_RESPONSE':
        return update(state, {
          transitIndex: {
            routes: {
              [action.payload.routeId]: {
                patterns: {
                  [action.payload.patternId]: {
                    geometry: { $set: action.payload.geometry }
                  }
                }
              }
            }
          }
        })
      case 'TNC_ETA_RESPONSE':
        return update(state, {
          tnc: {
            etaEstimates: {
              [action.payload.from]: fromData => {
                fromData = Object.assign({}, fromData)
                const estimates = action.payload.estimates || []
                estimates.forEach(estimate => {
                  if (!fromData[estimate.company]) {
                    fromData[estimate.company] = {}
                  }
                  fromData[estimate.company][estimate.productId] = Object.assign(
                    {
                      estimateTimestamp: new Date()
                    },
                    estimate
                  )
                })
                return fromData
              }
            }
          }
        })
      case 'TNC_RIDE_RESPONSE':
        return update(state, {
          tnc: {
            rideEstimates: {
              [action.payload.from]: fromData => {
                fromData = Object.assign({}, fromData)
                const {company, rideEstimate, to} = action.payload
                if (!rideEstimate) {
                  return fromData
                }
                if (!fromData[to]) {
                  fromData[to] = {}
                }
                if (!fromData[to][company]) {
                  fromData[to][company] = {}
                }
                fromData[to][company][rideEstimate.rideType] = Object.assign(
                  {
                    estimateTimestamp: new Date()
                  },
                  rideEstimate
                )
                return fromData
              }
            }
          }
        })

      case 'PARK_AND_RIDE_RESPONSE':
        return update(state, {
          overlay: {
            parkAndRide: {
              locations: { $set: action.payload },
              pending: { $set: false }
            }
          }
        })

      // TODO: can this be broken out into a separate module?
      case 'ZIPCAR_LOCATIONS_RESPONSE':
        return update(state, {
          overlay: {
            zipcar: {
              locations: { $set: action.payload.locations },
              pending: { $set: false }
            }
          }
        })
      // case 'INITIALIZE_TRANSITIVE':
      //   const transitive = new Transitive({
      //     data: action.payload.transitiveData,
      //     initialBounds: action.payload.bounds,
      //     zoomEnabled: false,
      //     autoResize: false,
      //     styles: require('./transitive-styles'),
      //     zoomFactors,
      //     display: 'canvas',
      //     canvas
      //   })
      //   return update(state, {
      //     overlay: {
      //       transitive: { $set: }
      //     }
      //   })
      default:
        return state
    }
  }
}

export default createOtpReducer
