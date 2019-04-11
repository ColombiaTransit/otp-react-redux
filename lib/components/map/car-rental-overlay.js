import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { FeatureGroup, Marker, Popup } from 'react-leaflet'
import { divIcon } from 'leaflet'

import SetFromToButtons from './set-from-to'
import { carRentalQuery } from '../../actions/api'
import { setLocation } from '../../actions/map'

class CarRentalOverlay extends Component {
  static propTypes = {
    queryMode: PropTypes.string,
    vehicles: PropTypes.array,
    refreshVehicles: PropTypes.func
  }

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
    if (this.props.visible) this._startRefreshing()
  }

  componentWillUnmount () {
    this._stopRefreshing()
  }

  componentWillReceiveProps (nextProps) {
    if (!this.props.visible && nextProps.visible) {
      this._startRefreshing()
    } else if (this.props.visible && !nextProps.visible) {
      this._stopRefreshing()
    } else if (
      this.props.visible &&
      nextProps.visible &&
      this.props.companies !== nextProps.companies
    ) {
      this._startRefreshing()
    }
  }

  render () {
    const { stations } = this.props

    if (!stations || stations.length === 0) return <FeatureGroup />

    const markerIcon = divIcon({
      iconSize: [11, 16],
      popupAnchor: [0, -6],
      html: '<i />',
      className: 'fa fa-map-marker car-rental-icon'
    })

    const bulletIconStyle = {
      color: 'gray',
      fontSize: 12,
      width: 10
    }

    return (
      <FeatureGroup>
        {stations.map((station) => {
          const stationName = `${station.networks.join('/')} ${station.id}`
          return (
            <Marker
              icon={markerIcon}
              key={station.id}
              position={[station.y, station.x]}
            >
              <Popup>
                <div className='map-overlay-popup'>
                  {/* Popup title */}
                  <div className='popup-title'>
                    {stationName}
                  </div>

                  {/* Car address bullet */}
                  {station.address && (
                    <div className='popup-row'>
                      <i className='fa fa-map-marker' style={bulletIconStyle} /> {station.address.split(',')[0]}
                    </div>
                  )}

                  {/* Set as from/to toolbar */}
                  <div className='popup-row'>
                    <SetFromToButtons
                      map={this.context.map}
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
            </Marker>
          )
        })}
      </FeatureGroup>
    )
  }
}

// connect to the redux store

const mapStateToProps = (state, ownProps) => {
  return {
    companies: state.otp.currentQuery.companies,
    stations: state.otp.overlay.carRental.stations
  }
}

const mapDispatchToProps = {
  refreshVehicles: carRentalQuery,
  setLocation
}

export default connect(mapStateToProps, mapDispatchToProps)(CarRentalOverlay)
