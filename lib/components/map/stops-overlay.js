import { divIcon } from 'leaflet'
import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { FeatureGroup, MapLayer, Popup, Marker } from 'react-leaflet'
import { Button } from 'react-bootstrap'

import SetFromToButtons from './set-from-to'
import { hasTransit } from '../../util/itinerary'
import { isMobile } from '../../util/ui'
import { findStopsWithinBBox, clearStops } from '../../actions/api'
import { setLocation } from '../../actions/map'
import { setViewedStop, setMainPanelContent } from '../../actions/ui'

class StopsOverlay extends MapLayer {
  static propTypes = {
    minZoom: PropTypes.number,
    queryMode: PropTypes.string,
    stops: PropTypes.array,
    refreshStops: PropTypes.func
  }

  static defaultProps = {
    minZoom: 15
  }

  componentDidMount () {
    // set up pan/zoom listener
    this.context.map.on('moveend', () => {
      this._refreshStops()
    })
  }

  // TODO: determine why the default MapLayer componentWillUnmount() method throws an error
  componentWillUnmount () { }

  _refreshStops () {
    if (this.context.map.getZoom() < this.props.minZoom) {
      this.forceUpdate()
      return
    }

    const bounds = this.context.map.getBounds()
    if (!bounds.equals(this.lastBounds)) {
      setTimeout(() => {
        this.props.refreshStops({
          minLat: bounds.getSouth(),
          maxLat: bounds.getNorth(),
          minLon: bounds.getWest(),
          maxLon: bounds.getEast()
        })
        this.lastBounds = bounds
      }, 300)
    }
  }

  createLeafletElement () {
  }

  updateLeafletElement () {
  }

  render () {
    const { minZoom, queryMode, setLocation, setViewedStop, setMainPanelContent, stops } = this.props
    const mobileView = isMobile()
    // don't render if below zoom threshold or transit not currently selected
    if (
      this.context.map.getZoom() < minZoom ||
      !hasTransit(queryMode) ||
      !stops ||
      stops.length === 0
    ) return <FeatureGroup />

    return (
      <FeatureGroup>
        {stops.map((stop) => (
          <StopMarker
            key={stop.id}
            stop={stop}
            mobileView={mobileView}
            setLocation={setLocation}
            setViewedStop={setViewedStop}
            setMainPanelContent={setMainPanelContent}
          />
        ))}
      </FeatureGroup>
    )
  }
}

class StopMarker extends Component {
  static propTypes = {
    mobileView: PropTypes.bool,
    setLocation: PropTypes.func,
    setViewedStop: PropTypes.func,
    setMainPanelContent: PropTypes.func,
    stop: PropTypes.object
  }

  _onClickView = () => {
    this.props.setMainPanelContent(null)
    this.props.setViewedStop({ stopId: this.props.stop.id })
  }

  render () {
    const { setLocation, stop, languageConfig } = this.props
    const { id, name, lat, lon } = stop
    const idArr = id.split(':')
    const radius = 20
    const half = radius / 2
    const quarter = radius / 4
    const html = `<div class="stop-overlay-icon" style="height: ${half}px; width: ${half}px; margin-left: ${quarter}px; margin-top: ${quarter}px;" />`
    const icon = divIcon({
      html,
      className: 'stop-overlay-bg',
      iconSize: radius
    })
    return (
      <Marker
        position={[lat, lon]}
        icon={icon}
      >
        <Popup>
          <div className='map-overlay-popup'>
            <div className='popup-title'>{name}</div>

            <div className='popup-row'><b>Agency:</b> {idArr[0]}</div>
            <div className='popup-row'>
              <span><b>Stop ID:</b> {idArr[1]}</span>
              {/* The Stop Viewer button
                * Note: we use a vanilla Button instead of ViewStopButton because
                * connected components don't work within react-leaflet Popups)
                * TODO: Make ViewStopButton work here, perhaps w/ React 16 portals
                */}
              <Button
                className='view-stop-button'
                bsSize='xsmall'
                onClick={this._onClickView}
              >{languageConfig.stopViewer || 'Stop Viewer'}</Button>
            </div>

            {/* The "Set as [from/to]" ButtonGroup */}
            <div className='popup-row'>
              <SetFromToButtons
                map={this.context.map}
                location={{ lat, lon, name }}
                setLocation={setLocation}
              />
            </div>
          </div>
        </Popup>
      </Marker>
    )
  }
}

// connect to the redux store

const mapStateToProps = (state, ownProps) => {
  return {
    stops: state.otp.overlay.transit.stops,
    queryMode: state.otp.currentQuery.mode,
    languageConfig: state.otp.config.language
  }
}

const mapDispatchToProps = {
  refreshStops: findStopsWithinBBox,
  clearStops,
  setLocation,
  setViewedStop,
  setMainPanelContent
}

export default connect(mapStateToProps, mapDispatchToProps)(StopsOverlay)
