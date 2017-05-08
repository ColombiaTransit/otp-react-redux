import {latLngBounds} from 'leaflet'
import polyline from '@mapbox/polyline'
import objectPath from 'object-path'
import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { Map } from 'react-leaflet'
import { VelocityTransitionGroup } from 'velocity-react'

import { setLocation, showInfoBar } from '../../actions/map'
import { constructLocation } from '../../util/map'
import { getActiveItinerary, getActiveSearch } from '../../util/state'
import InfoBar from './info-bar'

class BaseMap extends Component {
  static propTypes = {
    // application state:
    config: PropTypes.object,
    infoBarState: PropTypes.object,

    // dispatch:
    isFromSet: PropTypes.func,
    isToSet: PropTypes.func,
    mapClick: PropTypes.func,
    setLocation: PropTypes.func, // TODO: rename from action name to avoid namespace conflict?
    showInfoBar: PropTypes.func
  }

  _onClick = (e) => {
    const location = constructLocation(e.latlng)
    // if (!this.props.isFromSet) this.props.setLocation('from', location)
    // else if (!this.props.isToSet) this.props.setLocation('to', location)
    // else {
    //   this.props.showInfoBar({ type: 'LOCATION', location })
    // }
    this.props.showInfoBar({ type: 'LOCATION', location })
  }

  // TODO: make map controlled component
  _mapBoundsChanged = (e) => {
    // if (this.state.zoomToTarget) {
    //   setTimeout(() => { this.setState({zoomToTarget: false}) }, 200)
    //   return false
    // } else {
    // const zoom = e.target.getZoom()
    const bounds = e.target.getBounds()
    // if (this.props.mapState.zoom !== zoom) {
    //   this.props.updateMapState({zoom})
    // }
    if (!bounds.equals(this.props.mapState.bounds)) {
      this.props.updateMapState({bounds: e.target.getBounds()})
    }
    // }
  }

  componentWillReceiveProps (nextProps) {
    // TODO: maybe setting bounds ought to be handled in map props...
    // Pan to to entire itinerary if made active (clicked)
    if (nextProps.itinerary && nextProps.activeLeg === null) {
      let coords = []
      nextProps.itinerary.legs.forEach(leg => {
        const legCoords = polyline.toGeoJSON(leg.legGeometry.points).coordinates.map(c => [c[1], c[0]])
        coords = [
          ...coords,
          ...legCoords
        ]
      })
      this.refs.map && this.refs.map.leafletElement.fitBounds(latLngBounds(coords), {padding: [3, 3]})
    }
    // Pan to to itinerary step if made active (clicked)
    if (nextProps.itinerary && nextProps.activeLeg !== null && nextProps.activeStep !== null && nextProps.activeStep !== this.props.activeStep) {
      const leg = nextProps.itinerary.legs[nextProps.activeLeg]
      const step = leg.steps[nextProps.activeStep]
      this.refs.map && this.refs.map.leafletElement.panTo([step.lat, step.lon])
    }
    // Pan to to itinerary leg if made active (clicked)
    if (nextProps.itinerary && nextProps.activeLeg !== this.props.activeLeg) {
      this.refs.map && this.refs.map.leafletElement.eachLayer(l => {
        if (objectPath.has(l, 'feature.geometry.index') && l.feature.geometry.index === nextProps.activeLeg) {
          this.refs.map.leafletElement.fitBounds(l.getBounds())
        }
      })
    }
  }

  render () {
    const {
      config,
      children,
      infoBarState
    } = this.props
    const position = [config.map.initLat, config.map.initLon]
    // const position = [+mapState.lat, +mapState.lon]
    // const zoom = +mapState.zoom
    const zoom = config.map.initZoom || 13
    const bounds = null // mapState.bounds
    const mapProps = {
      ref: 'map',
      className: 'map',
      // center: position,
      // bounds: mapState.bounds || null,
      // zoom: config.initZoom,
      // zoom: +mapState.zoom,
      onClick: this._onClick
      // onMoveEnd: this._mapBoundsChanged,
      // onZoomEnd: this._mapBoundsChanged,
    }
    if (bounds) {
      mapProps.bounds = bounds
    } else if (position && zoom) {
      mapProps.center = position
      mapProps.zoom = zoom
    } else {
      console.error('no map position/bounds provided!', {position, zoom, bounds})
    }
    return (
      <div className='map'>
        <Map
          ref='map'
          center={position}
          zoom={config.map.initZoom || 13}
          onClick={this._onClick}
        >
          {children}
        </Map>
        <VelocityTransitionGroup enter={{animation: 'slideDown'}} leave={{animation: 'slideUp'}}>
          {infoBarState.visible ? <InfoBar /> : null }
        </VelocityTransitionGroup>
      </div>
    )
  }
}

// connect to the redux store

const mapStateToProps = (state, ownProps) => {
  const activeSearch = getActiveSearch(state.otp)
  return {
    activeLeg: activeSearch && activeSearch.activeLeg,
    activeStep: activeSearch && activeSearch.activeStep,
    config: state.otp.config,
    mapState: state.otp.mapState,
    isFromSet: state.otp.currentQuery.from && state.otp.currentQuery.from.lat !== null && state.otp.currentQuery.from.lon !== null,
    isToSet: state.otp.currentQuery.to && state.otp.currentQuery.to.lat !== null && state.otp.currentQuery.to.lon !== null,
    itinerary: getActiveItinerary(state.otp),
    infoBarState: state.otp.ui.infoBar
  }
}

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    setLocation: (type, location) => { dispatch(setLocation({ type, location })) },
    showInfoBar: (infoBarCfg) => { dispatch(showInfoBar(infoBarCfg)) }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(BaseMap)
