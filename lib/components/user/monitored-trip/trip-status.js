import moment from 'moment'
import {
  formatDuration,
  getDateFormat,
  getLongDateFormat,
  getTimeFormat
} from '@opentripplanner/core-utils/lib/time'
import AlertsBody from '@opentripplanner/itinerary-body/lib/TransitLegBody/alerts-body'
import React, { Component } from 'react'
import { Button, Glyphicon, Panel } from 'react-bootstrap'
import { connect } from 'react-redux'
import styled from 'styled-components'

import {
  deleteUserMonitoredTrip,
  planNewTripFromMonitoredTrip,
  togglePauseTrip,
  toggleSnoozeTrip
} from '../../../actions/user'
import {
  getMinutesUntilItineraryStart
} from '../../../util/itinerary'

// the threshold for schedule deviation in seconds for whether an arrival or
// departure time is to be considered on-time
const ON_TIME_THRESHOLD_SECONDS = 120

const FooterButton = styled(Button)`
  margin-right: 10px;
`

class TripSummary extends Component {
  getJourneyState = () => {
    const { monitoredTrip } = this.props
    return monitoredTrip && monitoredTrip.journeyState
  }

  onClickDeleteTrip = () => {
    const { deleteUserMonitoredTrip, monitoredTrip } = this.props
    deleteUserMonitoredTrip(monitoredTrip.id)
  }

  onClickPlanNewTrip = () => {
    const { planNewTripFromMonitoredTrip, monitoredTrip } = this.props
    planNewTripFromMonitoredTrip(monitoredTrip)
  }

  onClickTogglePauseTrip = () => {
    const { togglePauseTrip, monitoredTrip } = this.props
    togglePauseTrip(monitoredTrip)
  }

  onClickToggleSnoozeTodaysTrip = () => {
    const { toggleSnoozeTrip, monitoredTrip } = this.props
    toggleSnoozeTrip(monitoredTrip)
  }

  /**
   * A helper method to render realtime data about a monitored trip. It is
   * assumed that the journeyState of the monitored trip will be either
   * `TRIP_UPCOMING` or `TRIP_ACTIVE`.
   */
  renderRealtimeInfo = () => {
    const { monitoredTrip } = this.props
    const journeyState = this.getJourneyState()

    const { dateFormat, timeFormat } = this.props
    const extendedDateTimeFormat = `dddd ${dateFormat} [at] ${timeFormat}`
    const { matchingItinerary } = journeyState
    const tripStartMoment = moment(matchingItinerary.startTime)
    const tripEndMoment = moment(matchingItinerary.endTime)

    let body
    let headerText
    let panelBsStyle = 'info'
    if (journeyState.tripStatus === 'TRIP_UPCOMING') {
      const minutesUntilTripStart = getMinutesUntilItineraryStart(
        matchingItinerary
      )
      if (minutesUntilTripStart > monitoredTrip.leadTimeInMinutes) {
        headerText = `Next trip starts on ${tripStartMoment.format(extendedDateTimeFormat)}.`
      } else {
        // analyze whether the journey state indicates that the matching
        // itinerary has realtime data. It is assumed that realtime data will
        // exist for itineraries that have differing values of the scheduled
        // departure time and matching itinerary departure time.
        if (journeyState.hasRealtimeData) {
          // calculate the deviation from the scheduled departure time (positive
          // value indicates delay)
          const departureDeviationSeconds = (
            matchingItinerary.startTime -
            journeyState.scheduledDepartureTimeEpochMillis
          ) / 1000
          const deviationHumanDuration = formatDuration(
            Math.abs(departureDeviationSeconds)
          )
          if (Math.abs(departureDeviationSeconds) < ON_TIME_THRESHOLD_SECONDS) {
            // about on time
            headerText = 'Trip is starting soon and is about on time.'
            panelBsStyle = 'success'
          } else if (departureDeviationSeconds > 0) {
            // delayed
            headerText = `Trip start time is delayed ${deviationHumanDuration}!`
            panelBsStyle = 'warning'
          } else {
            // early
            headerText = `Trip start time is happening ${deviationHumanDuration} earlier than expected!`
            panelBsStyle = 'warning'
          }
        } else {
          headerText = 'Trip is starting soon (no realtime updates available).'
          panelBsStyle = undefined
        }
      }

      body = `Trip is due to begin at ${tripStartMoment.format(timeFormat)}.`
    } else if (journeyState.tripStatus === 'TRIP_ACTIVE') {
      // analyze whether the journey state indicates that the matching itinerary
      // has realtime data. It is assumed that realtime data will exist for
      // itineraries that have differing values of the scheduled arrival time
      // and matching itinerary arrival time.
      if (journeyState.hasRealtimeData) {
        // calculate the deviation from the scheduled arrival time (positive
        // value indicates delay)
        const arrivalDeviationSeconds = (
          matchingItinerary.endTime -
          journeyState.scheduledArrivalTimeEpochMillis
        ) / 1000
        const deviationHumanDuration = formatDuration(
          Math.abs(arrivalDeviationSeconds)
        )
        if (Math.abs(arrivalDeviationSeconds) < ON_TIME_THRESHOLD_SECONDS) {
          // about on time
          headerText = 'Trip is in progress and is about on time.'
          panelBsStyle = 'success'
        } else if (arrivalDeviationSeconds > 0) {
          // delayed
          headerText = `Trip is in progress and is delayed ${deviationHumanDuration}!`
          panelBsStyle = 'warning'
        } else {
          // early
          headerText = `Trip is in progress and is arriving ${deviationHumanDuration} earlier than expected!`
          panelBsStyle = 'warning'
        }
      } else {
        headerText = 'Trip is in progress (no realtime updates available).'
        panelBsStyle = undefined
      }

      body = `Trip is due to arrive at the desitination at ${tripEndMoment.format(timeFormat)}.`
    }

    return {
      body,
      headerText,
      panelBsStyle
    }
  }

  /**
   * Contains panel rendering info for all the conditions encountered.
   */
  getRenderInfo = () => {
    const { monitoredTrip } = this.props
    const journeyState = this.getJourneyState()

    // Whether the trip status was calculated
    let tripStatusCalculated = true

    // Header and body
    let headerText
    let body
    let panelBsStyle

    // Footer buttons
    let showDeleteTripButton
    let showPlanNewTripButton
    let showTogglePauseTripButton
    let showToggleSnoozeTripButton

    if (!monitoredTrip.isActive) {
      headerText = 'Trip monitoring is paused'
      body = 'Resume trip monitoring to see the updated status'
      panelBsStyle = undefined
      showTogglePauseTripButton = true
    } else if (monitoredTrip.snoozed) {
      headerText = 'Trip monitoring is snoozed for today'
      body = 'Unsnooze trip monitoring to see the updated status'
      panelBsStyle = undefined
      showToggleSnoozeTripButton = true
    } else {
      switch (journeyState.tripStatus) {
        case 'NO_LONGER_POSSIBLE':
          headerText = 'Trip is no longer possible.'
          body = 'The trip planner was unable to find your trip on any selected days of the week. Please try re-planning your itinerary to find an alternative route.'
          panelBsStyle = 'error'
          showDeleteTripButton = true
          showPlanNewTripButton = true
          break
        case 'NEXT_TRIP_NOT_POSSIBLE':
          headerText = 'Trip is not possible today.'
          body = 'The trip planner was unable to find your trip today. Please try re-planning your itinerary to find an alternative route.'
          panelBsStyle = 'error'
          showPlanNewTripButton = true
          showTogglePauseTripButton = true
          break
        case 'TRIP_UPCOMING':
        case 'TRIP_ACTIVE':
          ({ body, headerText, panelBsStyle } = this.renderRealtimeInfo())
          showToggleSnoozeTripButton = true
          showTogglePauseTripButton = true
          break
        default:
          // trip status not yet calculated
          tripStatusCalculated = false
      }
    }

    const secondsSinceLastCheck = moment().diff(
      moment(journeyState.lastCheckedEpochMillis),
      'seconds'
    )
    const lastCheckedText = `Last checked: ${formatDuration(secondsSinceLastCheck)} ago`

    return {
      body,
      headerText,
      lastCheckedText,
      panelBsStyle,
      showDeleteTripButton,
      showPlanNewTripButton,
      showTogglePauseTripButton,
      showToggleSnoozeTripButton,
      tripStatusCalculated
    }
  }

  renderAlerts = () => {
    const { longDateFormat, monitoredTrip, timeFormat } = this.props
    const journeyState = this.getJourneyState()
    const { matchingItinerary } = journeyState

    // don't show alerts for trips that are no longer possible, not possible for
    // the current trip or if the trip is paused or snoozed
    if (
      !monitoredTrip.isActive ||
        monitoredTrip.snoozed ||
        journeyState.tripStatus === 'NO_LONGER_POSSIBLE' ||
        journeyState.tripStatus === 'NEXT_TRIP_NOT_POSSIBLE'
    ) {
      return null
    }

    // don't show alerts for upcoming trips that aren't within the lead time
    if (journeyState.tripStatus === 'TRIP_UPCOMING') {
      const minutesUntilTripStart = getMinutesUntilItineraryStart(
        matchingItinerary
      )
      if (minutesUntilTripStart > monitoredTrip.leadTimeInMinutes) {
        return null
      }
    }

    const { alerts } = matchingItinerary

    if (!alerts || alerts.length === 0) return null

    let alertsHeader
    if (alerts.length === 1) {
      alertsHeader = `${alerts.length} alert exists for this trip!`
    } else {
      alertsHeader = `${alerts.length} alerts exist for this trip!`
    }

    return (
      <Panel.Body>
        <h4>{alertsHeader}</h4>
        <AlertsBody
          alerts={alerts}
          longDateFormat={longDateFormat}
          timeFormat={timeFormat}
        />
      </Panel.Body>
    )
  }

  renderFooterButtons = renderInfo => {
    const { monitoredTrip } = this.props
    const {
      showDeleteTripButton,
      showPlanNewTripButton,
      showTogglePauseTripButton,
      showToggleSnoozeTripButton,
      tripStatusCalculated
    } = renderInfo

    if (!tripStatusCalculated) {
      // trip status not yet calculated, return null
      return null
    }

    return (
      <Panel.Body>
        {showToggleSnoozeTripButton && (
          <FooterButton onClick={this.onClickToggleSnoozeTodaysTrip}>
            {monitoredTrip.snoozed
              ? <><Glyphicon glyph='play' /> Unsnooze trip analysis</>
              : <><Glyphicon glyph='pause' /> Snooze for rest of today</>
            }
          </FooterButton>
        )}
        {showTogglePauseTripButton && (
          <FooterButton onClick={this.onClickTogglePauseTrip}>
            {monitoredTrip.isActive
              ? <><Glyphicon glyph='pause' /> Pause</>
              : <><Glyphicon glyph='play' /> Resume</>
            }
          </FooterButton>
        )}
        {showDeleteTripButton && (
          <FooterButton
            bsStyle='error'
            onClick={this.onClickDeleteTrip}
          >
            <Glyphicon glyph='trash' /> Delete Trip
          </FooterButton>
        )}
        {showPlanNewTripButton && (
          <FooterButton onClick={this.onClickPlanNewTrip}>
            <Glyphicon glyph='search' /> Plan New Trip
          </FooterButton>
        )}
      </Panel.Body>
    )
  }

  render () {
    const journeyState = this.getJourneyState()
    if (!journeyState || !journeyState.matchingItinerary) return null

    const renderInfo = this.getRenderInfo()
    const {
      body,
      headerText,
      lastCheckedText,
      panelBsStyle
    } = renderInfo

    return (
      <Panel bsStyle={panelBsStyle}>
        <Panel.Heading>
          <h3>{headerText}</h3>
          <h6>{lastCheckedText}</h6>
        </Panel.Heading>
        <Panel.Body>{body}</Panel.Body>

        {this.renderAlerts()}
        {this.renderFooterButtons(renderInfo)}
      </Panel>
    )
  }
}

// connect to the redux store

const mapStateToProps = (state, ownProps) => {
  const dateFormat = getDateFormat(state.otp.config)
  const longDateFormat = getLongDateFormat(state.otp.config)
  const timeFormat = getTimeFormat(state.otp.config)
  return {
    dateFormat,
    longDateFormat,
    timeFormat
  }
}

const mapDispatchToProps = {
  deleteUserMonitoredTrip,
  planNewTripFromMonitoredTrip,
  togglePauseTrip,
  toggleSnoozeTrip
}

export default connect(mapStateToProps, mapDispatchToProps)(TripSummary)
