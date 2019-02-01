import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import MobileContainer from './container'
import MobileNavigationBar from './navigation-bar'

import TripViewer from '../viewers/trip-viewer'
import DefaultMap from '../map/default-map'

import { clearViewedTrip } from '../../actions/ui'

class MobileTripViewer extends Component {
  static propTypes = {
    clearViewedTrip: PropTypes.func
  }

  render () {
    return (
      <MobileContainer>
        <MobileNavigationBar
          headerText={this.props.languageConfig.tripViewer || 'Trip Viewer'}
          showBackButton
          onBackClicked={() => { this.props.clearViewedTrip() }}
        />

        {/* include map as fixed component */}
        <div className='viewer-map'>
          <DefaultMap />
        </div>

        {/* include TripViewer in embedded scrollable panel */}
        <div className='viewer-container'>
          <TripViewer hideBackButton />
        </div>
      </MobileContainer>
    )
  }
}

// connect to the redux store

const mapStateToProps = (state, ownProps) => {
  return {
    languageConfig: state.otp.config.language
  }
}

const mapDispatchToProps = {
  clearViewedTrip
}

export default connect(mapStateToProps, mapDispatchToProps)(MobileTripViewer)
