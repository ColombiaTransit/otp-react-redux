import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { setActiveItinerary, setActiveLeg, setActiveStep } from '../../actions/narrative'
import DefaultItinerary from './default/default-itinerary'
import NarrativeProfileSummary from './narrative-profile-summary'
import Loading from './loading'
import { getActiveSearch } from '../../util/state'
import { profileOptionsToItineraries } from '../../util/profile'

class NarrativeProfileOptions extends Component {
  static propTypes = {
    options: PropTypes.array,
    query: PropTypes.object,
    itineraryClass: PropTypes.func,
    pending: PropTypes.bool,
    activeOption: PropTypes.number,
    setActiveItinerary: PropTypes.func,
    setActiveLeg: PropTypes.func,
    setActiveStep: PropTypes.func,
    customIcons: PropTypes.object
  }

  static defaultProps = {
    itineraryClass: DefaultItinerary
  }

  render () {
    const { pending, itineraryClass, query, activeItinerary } = this.props
    if (pending) return <Loading />

    const options = this.props.options
    if (!options) return null

    const itineraries = profileOptionsToItineraries(options, query)

    return (
      <div className='options profile'>
        <div className='header'>Your best options:</div>
        <NarrativeProfileSummary options={options} customIcons={this.props.customIcons} />
        <div className='header'>We found <strong>{options.length}</strong> total options:</div>
        {itineraries.map((itinerary, index) => {
          return React.createElement(itineraryClass, {
            itinerary,
            index,
            key: index,
            active: index === activeItinerary,
            routingType: 'PROFILE',
            ...this.props
          })
        })}
      </div>
    )
  }
}

// connect to the redux store
const mapStateToProps = (state, ownProps) => {
  const activeSearch = getActiveSearch(state.otp)
  // const { activeItinerary, activeLeg, activeStep } = activeSearch ? activeSearch.activeItinerary : {}
  const pending = activeSearch && activeSearch.pending
  return {
    options:
      activeSearch &&
      activeSearch.response &&
      activeSearch.response.otp
        ? activeSearch.response.otp.profile
        : null,
    pending,
    activeItinerary: activeSearch && activeSearch.activeItinerary,
    activeLeg: activeSearch && activeSearch.activeLeg,
    activeStep: activeSearch && activeSearch.activeStep,
    query: activeSearch && activeSearch.query
  }
}

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    setActiveItinerary: (index) => { dispatch(setActiveItinerary({ index })) },
    setActiveLeg: (index, leg) => { dispatch(setActiveLeg({ index, leg })) },
    setActiveStep: (index, step) => { dispatch(setActiveStep({ index, step })) }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(NarrativeProfileOptions)
