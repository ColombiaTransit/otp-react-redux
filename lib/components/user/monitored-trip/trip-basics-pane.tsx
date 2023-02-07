import { connect } from 'react-redux'
import {
  ControlLabel,
  FormControl,
  FormGroup,
  Glyphicon,
  HelpBlock,
  ProgressBar
} from 'react-bootstrap'
import { Field, FormikProps } from 'formik'
import { FormattedMessage, injectIntl } from 'react-intl'
import { Itinerary } from '@opentripplanner/types'
import { Prompt } from 'react-router'
// @ts-expect-error FormikErrorFocus does not support TypeScript yet.
import FormikErrorFocus from 'formik-error-focus'
import React, { Component } from 'react'
import styled from 'styled-components'
import type { IntlShape, WrappedComponentProps } from 'react-intl'

import * as userActions from '../../../actions/user'
import { getErrorStates } from '../../../util/ui'
import { getFormattedDayOfWeekPlural } from '../../../util/monitored-trip'
import FormattedDayOfWeekCompact from '../../util/formatted-day-of-week-compact'
import FormattedValidationError from '../../util/formatted-validation-error'

import TripStatus from './trip-status'
import TripSummary from './trip-summary'

interface Fields {
  friday: boolean
  itinerary: Itinerary
  monday: boolean
  saturday: boolean
  sunday: boolean
  thursday: boolean
  tripName: string
  tuesday: boolean
  wednesday: boolean
}

type TripBasicsProps = WrappedComponentProps &
  FormikProps<Fields> & {
    canceled: boolean
    checkItineraryExistence: (monitoredTrip: unknown, intl: IntlShape) => void
    clearItineraryExistence: () => void
    isCreating: boolean
    itineraryExistence: Record<string, { valid: boolean }>
  }

// FIXME: move to shared types file
type ErrorStates = 'success' | 'warning' | 'error' | null | undefined

// FIXME: combine back with monitored trips when that is typed.
const ALL_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
] as const

// Styles.
const TripDayLabel = styled.label`
  border: 1px solid #ccc;
  border-left: none;
  box-sizing: border-box;
  display: inline-block;
  font-weight: inherit;
  float: left;
  height: 3em;
  max-width: 150px;
  min-width: 14.28%;
  text-align: center;
  & > span:first-of-type {
    display: block;
    width: 100%;
  }
  &:first-of-type {
    border-left: 1px solid #ccc;
  }
`

/**
 * This component shows summary information for a trip
 * and lets the user edit the trip name and day.
 */
class TripBasicsPane extends Component<TripBasicsProps> {
  /**
   * For new trips only, update the Formik state to
   * uncheck days for which the itinerary is not available.
   */
  _updateNewTripItineraryExistence = (prevProps: TripBasicsProps) => {
    const { isCreating, itineraryExistence, setFieldValue } = this.props

    if (
      isCreating &&
      itineraryExistence &&
      itineraryExistence !== prevProps.itineraryExistence
    ) {
      ALL_DAYS.forEach((day) => {
        if (!itineraryExistence[day].valid) {
          setFieldValue(day, false)
        }
      })
    }
  }

  componentDidMount() {
    // Check itinerary availability (existence) for all days.
    const { checkItineraryExistence, intl, values: monitoredTrip } = this.props
    checkItineraryExistence(monitoredTrip, intl)
  }

  componentDidUpdate(prevProps: TripBasicsProps) {
    this._updateNewTripItineraryExistence(prevProps)
  }

  componentWillUnmount() {
    this.props.clearItineraryExistence()
  }

  render() {
    const {
      canceled,
      dirty,
      errors,
      intl,
      isCreating,
      isSubmitting,
      itineraryExistence,
      values: monitoredTrip
    } = this.props
    const { itinerary } = monitoredTrip

    // Prevent user from leaving when form has been changed,
    // but don't show it when they click submit or cancel.
    const unsavedChanges = dirty && !isSubmitting && !canceled
    // Message changes depending on if the new or existing trip is being edited
    const unsavedChangesMessage = isCreating
      ? intl.formatMessage({
          id: 'components.TripBasicsPane.unsavedChangesNewTrip'
        })
      : intl.formatMessage({
          id: 'components.TripBasicsPane.unsavedChangesExistingTrip'
        })

    if (!itinerary) {
      return (
        <div>
          <FormattedMessage id="common.itineraryDescriptions.noItineraryToDisplay" />
        </div>
      )
    } else {
      // Show an error indication when
      // - monitoredTrip.tripName is not blank and that tripName is not already used.
      // - no day is selected (show a combined error indication).
      const errorStates = getErrorStates(this.props)

      let monitoredDaysValidationState: ErrorStates = null
      ALL_DAYS.forEach((day) => {
        if (!monitoredDaysValidationState) {
          monitoredDaysValidationState = errorStates[day]
        }
      })

      return (
        <div>
          {/* TODO: This component does not block navigation on reload or using the back button.
          This will have to be done at a higher level. See #376 */}
          <Prompt message={unsavedChangesMessage} when={unsavedChanges} />

          {/* Do not show trip status when saving trip for the first time
              (it doesn't exist in backend yet). */}
          {!isCreating && <TripStatus monitoredTrip={monitoredTrip} />}
          <ControlLabel>
            <FormattedMessage id="components.TripBasicsPane.selectedItinerary" />
          </ControlLabel>
          <TripSummary monitoredTrip={monitoredTrip} />

          <FormGroup validationState={errorStates.tripName}>
            <ControlLabel>
              <FormattedMessage id="components.TripBasicsPane.tripNamePrompt" />
            </ControlLabel>
            {/* onBlur, onChange, and value are passed automatically. */}
            <Field as={FormControl} name="tripName" />
            <FormControl.Feedback />
            {errors.tripName && (
              <HelpBlock>
                <FormattedValidationError type={errors.tripName} />
              </HelpBlock>
            )}
          </FormGroup>

          <FormGroup validationState={monitoredDaysValidationState}>
            <ControlLabel>
              <FormattedMessage id="components.TripBasicsPane.tripDaysPrompt" />
            </ControlLabel>
            <div>
              {ALL_DAYS.map((day) => {
                const isDayDisabled =
                  itineraryExistence && !itineraryExistence[day].valid
                const boxClass = isDayDisabled
                  ? 'alert-danger'
                  : monitoredTrip[day]
                  ? 'bg-primary'
                  : ''
                const notAvailableText = isDayDisabled
                  ? intl.formatMessage(
                      { id: 'components.TripBasicsPane.tripNotAvailableOnDay' },
                      { repeatedDay: getFormattedDayOfWeekPlural(day, intl) }
                    )
                  : ''

                return (
                  <TripDayLabel
                    className={boxClass}
                    key={day}
                    title={notAvailableText}
                  >
                    <span>
                      <FormattedDayOfWeekCompact day={day} />
                    </span>
                    {
                      // Let users save an existing trip, even though it may not be available on some days.
                      // TODO: improve checking trip availability.
                      isDayDisabled && isCreating ? (
                        <Glyphicon
                          aria-label={notAvailableText}
                          glyph="ban-circle"
                        />
                      ) : (
                        <Field name={day} type="checkbox" />
                      )
                    }
                  </TripDayLabel>
                )
              })}
              <div style={{ clear: 'both' }} />
            </div>
            <HelpBlock>
              {itineraryExistence ? (
                <FormattedMessage id="components.TripBasicsPane.tripIsAvailableOnDaysIndicated" />
              ) : (
                <ProgressBar
                  active
                  label={
                    <FormattedMessage id="components.TripBasicsPane.checkingItineraryExistence" />
                  }
                  now={100}
                />
              )}
            </HelpBlock>
            {monitoredDaysValidationState && (
              <HelpBlock>
                <FormattedMessage id="components.TripBasicsPane.selectAtLeastOneDay" />
              </HelpBlock>
            )}

            {/* Scroll to the trip name/days fields if submitting and there is an error on these fields. */}
            <FormikErrorFocus align="middle" duration={200} />
          </FormGroup>
        </div>
      )
    }
  }
}

// Connect to redux store

const mapStateToProps = (state: any) => {
  const { itineraryExistence } = state.user
  return {
    itineraryExistence
  }
}

const mapDispatchToProps = {
  checkItineraryExistence: userActions.checkItineraryExistence,
  clearItineraryExistence: userActions.clearItineraryExistence
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(injectIntl(TripBasicsPane))
