import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { CircleMarker, FeatureGroup, Marker, MapLayer, Popup, withLeaflet } from 'react-leaflet'
import { divIcon } from 'leaflet'

import SetFromToButtons from './set-from-to'
import { setLocation } from '../../actions/map'

class VehicleRentalOverlay extends MapLayer {
  static propTypes = {
    queryMode: PropTypes.string,
    vehicles: PropTypes.array,
    refreshVehicles: PropTypes.func
  }

  createLeafletElement () { }

  updateLeafletElement () { }

  _startRefreshing () {
    // ititial station retrieval
    this.props.refreshVehicles()

    // set up timer to refresh stations periodically
    this._refreshTimer = setInterval(() => {
      this.props.refreshVehicles()
    }, 30000) // defaults to every 30 sec. TODO: make this configurable?*/
  }

  _stopRefreshing () {
    if (this._refreshTimer) clearInterval(this._refreshTimer)
  }

  componentDidMount () {
    const {companies, mapSymbols, name, visible} = this.props
    if (visible) this._startRefreshing()
    if (!mapSymbols) console.warn(`No map symbols provided for layer ${name}`, companies)
  }

  componentWillUnmount () {
    this._stopRefreshing()
  }

  componentWillReceiveProps (nextProps) {
    if (!this.props.visible && nextProps.visible) {
      this._startRefreshing()
    } else if (this.props.visible && !nextProps.visible) {
      this._stopRefreshing()
    }
  }

  _renderPopupForStation = (station) => {
    const stationName = `${station.networks.join('/')} ${station.name || station.id}`
    return (
      <Popup>
        <div className='map-overlay-popup'>
          {/* Popup title */}
          <div className='popup-title'>
            Floating vehicle {stationName}
          </div>

          {/* Set as from/to toolbar */}
          <div className='popup-row'>
            <SetFromToButtons
              map={this.props.leaflet.map}
              location={{
                lat: station.y,
                lon: station.x,
                name: stationName
              }}
              setLocation={this.props.setLocation}
            />
          </div>
        </div>
      </Popup>
    )
  }

  _renderStationAsCircle = (station, symbolDef) => {
    let strokeColor = symbolDef.strokeColor || symbolDef.fillColor
    if (!station.isFloatingBike) {
      strokeColor = symbolDef.dockStrokeColor || strokeColor
    }
    return (
      <CircleMarker
        key={station.id}
        center={[station.y, station.x]}
        color={strokeColor}
        fillColor={symbolDef.fillColor}
        fillOpacity={1}
        radius={symbolDef.pixels - (station.isFloatingBike ? 1 : 0)}
        weight={1}
      >
        {this._renderPopupForStation(station)}
      </CircleMarker>
    )
  }

  _renderStationAsHubAndFloatingBike = (station) => {
    let icon
    if (station.isFloatingBike) {
      icon = divIcon({
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -12],
        html: `<div class="bike-rental-hub-icon bike-rental-out-of-hub"></div>`,
        className: ''
      })
    } else {
      const pctFull = station.bikesAvailable / (station.bikesAvailable + station.spacesAvailable)
      const i = Math.round(pctFull * 9)
      icon = divIcon({
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -12],
        html: `<div class="bike-rental-hub-icon bike-rental-hub-icon-${i}"></div>`,
        className: ''
      })
    }
    return (
      <Marker
        icon={icon}
        key={station.id}
        position={[station.y, station.x]}
      >
        <Popup>
          <div className='map-overlay-popup'>
            {/* Popup title */}
            <div className='popup-title'>
              {station.isFloatingBike
                ? <span>Floating bike: {station.name}</span>
                : <span>{station.name}</span>
              }
            </div>

            {/* Details */}
            {!station.isFloatingBike && (
              <div className='popup-row'>
                <div>Available bikes: {station.bikesAvailable}</div>
                <div>Available docks: {station.spacesAvailable}</div>
              </div>
            )}

            {/* Set as from/to toolbar */}
            <div className='popup-row'>
              <SetFromToButtons
                map={this.props.leaflet.map}
                location={{
                  lat: station.y,
                  lon: station.x,
                  name: station.name
                }}
                setLocation={this.props.setLocation}
              />
            </div>
          </div>
        </Popup>
      </Marker>
    )
  }

  _renderStationAsMarker = (station, symbolDef) => {
    const {baseIconClass} = this.props
    let classes = `fa fa-map-marker ${baseIconClass}`
    // If this station is exclusive to a single network, apply the the class for that network
    if (station.networks.length === 1) {
      classes += ` ${baseIconClass}-${station.networks[0].toLowerCase()}`
    }
    const color = symbolDef && symbolDef.fillColor
      ? symbolDef.fillColor
      : 'gray'
    const markerIcon = divIcon({
      className: '',
      iconSize: [11, 16],
      popupAnchor: [0, -6],
      html: `<i class="${classes}" style="color: ${color}"/>`
    })

    return (
      <Marker
        icon={markerIcon}
        key={station.id}
        position={[station.y, station.x]}
      >
        {this._renderPopupForStation(station)}
      </Marker>
    )
  }

  _renderStation = (station) => {
    // render the station according to any map symbol configuration
    const {mapSymbols} = this.props

    // no config set, just render a default marker
    if (!mapSymbols) return this._renderStationAsMarker(station)

    // get zoom to check which symbol to render
    const zoom = this.props.leaflet.map.getZoom()

    for (let i = 0; i < mapSymbols.length; i++) {
      const symbolDef = mapSymbols[i]
      if (symbolDef.minZoom <= zoom && symbolDef.maxZoom >= zoom) {
        switch (symbolDef.type) {
          case 'circle':
            return this._renderStationAsCircle(station, symbolDef)
          case 'hubAndFloatingBike':
            return this._renderStationAsHubAndFloatingBike(station)
          default:
            return this._renderStationAsMarker(station, symbolDef)
        }
      }
    }

    // no matching symbol definition, render default marker
    return this._renderStationAsMarker(station)
  }

  render () {
    const { stations, companies } = this.props
    let filteredStations = stations
    if (companies) {
      filteredStations = stations.filter(
        station => station.networks.filter(value => companies.includes(value)).length > 0
      )
    }

    if (!filteredStations || filteredStations.length === 0) return <FeatureGroup />

    return (
      <FeatureGroup>
        {filteredStations.map(this._renderStation)}
      </FeatureGroup>
    )
  }
}

// connect to the redux store

const mapStateToProps = (state, ownProps) => {
  return {
    zoom: state.otp.config.map.initZoom
  }
}

const mapDispatchToProps = {
  setLocation
}

export default connect(mapStateToProps, mapDispatchToProps)(withLeaflet(VehicleRentalOverlay))
