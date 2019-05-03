'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _time = require('../util/time');

var _itinerary = require('../util/itinerary');

/**
 * name: the default name of the parameter used for internal reference and API calls
 * planTypes: array of plan type(s) (ITINERARY, PROFILE, or both) this param applies to
 * default: the default value for this param
 * itineraryRewrite: an optional function for translating the value for the plan API only
 * profileRewrite: an optional function for translating the value for the profile API only
 * label: a text label for for onscreen display
 * selector: the default type of UI selector to use in the form. Can be one of:
 *   - DROPDOWN: a standard drop-down menu selector
 * options: an array of text/value pairs used with a dropdown selector
 */

var queryParams = [{ /* from - the trip origin. stored internally as a location (lat/lon/name) object  */
  name: 'from',
  planTypes: ['ITINERARY', 'PROFILE'],
  default: null,
  itineraryRewrite: function itineraryRewrite(value) {
    return { fromPlace: value.lat + ',' + value.lon };
  },
  profileRewrite: function profileRewrite(value) {
    return { from: { lat: value.lat, lon: value.lon } };
  }
}, { /* to - the trip destination. stored internally as a location (lat/lon/name) object  */
  name: 'to',
  planTypes: ['ITINERARY', 'PROFILE'],
  default: null,
  itineraryRewrite: function itineraryRewrite(value) {
    return { toPlace: value.lat + ',' + value.lon };
  },
  profileRewrite: function profileRewrite(value) {
    return { to: { lat: value.lat, lon: value.lon } };
  }
}, { /* date - the date of travel, in MM-DD-YYYY format */
  name: 'date',
  planTypes: ['ITINERARY', 'PROFILE'],
  default: (0, _time.getCurrentDate)()
}, { /* time - the arrival/departure time for an itinerary trip, in HH:MM format */
  name: 'time',
  planTypes: ['ITINERARY'],
  default: (0, _time.getCurrentTime)()
}, { /* departArrive - whether this is a depart-at, arrive-by, or leave-now trip */
  name: 'departArrive',
  planTypes: ['ITINERARY'],
  default: 'NOW',
  itineraryRewrite: function itineraryRewrite(value) {
    return { arriveBy: value === 'ARRIVE' };
  }
}, { /* startTime - the start time for a profile trip, in HH:MM format */
  name: 'startTime',
  planTypes: ['PROFILE'],
  default: '07:00'
}, { /* endTime - the end time for a profile trip, in HH:MM format */
  name: 'endTime',
  planTypes: ['PROFILE'],
  default: '09:00'
}, { /* mode - the allowed modes for a trip, as a comma-separated list */
  name: 'mode',
  planTypes: ['ITINERARY', 'PROFILE'],
  default: 'TRAM,BUS,GONDOLA,WALK,BICYCLE,BICYCLE_RENT',
  profileRewrite: function profileRewrite(value) {
    var accessModes = [];
    var directModes = [];
    var transitModes = [];

    if (value && value.length > 0) {
      value.split(',').forEach(function (m) {
        if ((0, _itinerary.isTransit)(m)) transitModes.push(m);
        if ((0, _itinerary.isAccessMode)(m)) {
          accessModes.push(m);
          // TODO: make configurable whether direct-driving is considered
          if (!(0, _itinerary.isCar)(m)) directModes.push(m);
        }
      });
    }

    return { accessModes: accessModes, directModes: directModes, transitModes: transitModes };
  }
}, { /* showIntermediateStops - whether response should include intermediate stops for transit legs */
  name: 'showIntermediateStops',
  planTypes: ['ITINERARY'],
  default: true
}, { /* maxWalkDistance - the maximum distance in meters the user will walk */
  name: 'maxWalkDistance',
  planTypes: ['ITINERARY'],
  default: 402.3,
  selector: 'DROPDOWN',
  label: 'Maximum Walk',
  options: [{
    text: '1/10 mile',
    value: 160.9
  }, {
    text: '1/4 mile',
    value: 402.3
  }, {
    text: '1/2 mile',
    value: 804.7
  }, {
    text: '1 mile',
    value: 1609
  }, {
    text: '2 miles',
    value: 3219
  }, {
    text: '5 miles',
    value: 8047
  }]
}, { /* optimize -- how to optimize an itinerary trip */
  name: 'optimize',
  planTypes: ['ITINERARY'],
  default: 'QUICK',
  selector: 'DROPDOWN',
  label: 'Optimize for',
  options: [{
    text: 'Speed',
    value: 'QUICK'
  }, {
    text: 'Transfers',
    value: 'TRANSFERS'
  }]
}, { /* maxWalkTime -- the maximum time the user will spend walking in minutes */
  name: 'maxWalkTime',
  planTypes: ['PROFILE'],
  default: 15,
  selector: 'DROPDOWN',
  label: 'Max Walk Time',
  options: [{
    text: '5 minutes',
    value: 5
  }, {
    text: '10 minutes',
    value: 10
  }, {
    text: '15 minutes',
    value: 15
  }, {
    text: '20 minutes',
    value: 20
  }, {
    text: '30 minutes',
    value: 30
  }, {
    text: '45 minutes',
    value: 45
  }, {
    text: '1 hour',
    value: 60
  }]
}, { /* walkSpeed -- the user's walking speed in m/s */
  name: 'walkSpeed',
  planTypes: ['ITINERARY', 'PROFILE'],
  default: 1.34,
  selector: 'DROPDOWN',
  label: 'Walk Speed',
  options: [{
    text: '2 MPH',
    value: 0.89
  }, {
    text: '3 MPH',
    value: 1.34
  }, {
    text: '4 MPH',
    value: 1.79
  }]
}, { /* maxBikeTime -- the maximum time the user will spend biking in minutes */
  name: 'maxBikeTime',
  planTypes: ['PROFILE'],
  default: 20,
  selector: 'DROPDOWN',
  label: 'Max Bike Time',
  options: [{
    text: '5 minutes',
    value: 5
  }, {
    text: '10 minutes',
    value: 10
  }, {
    text: '15 minutes',
    value: 15
  }, {
    text: '20 minutes',
    value: 20
  }, {
    text: '30 minutes',
    value: 30
  }, {
    text: '45 minutes',
    value: 45
  }, {
    text: '1 hour',
    value: 60
  }]
}, { /* bikeSpeed -- the user's bikeSpeed speed in m/s */
  name: 'bikeSpeed',
  planTypes: ['ITINERARY', 'PROFILE'],
  default: 3.58,
  selector: 'DROPDOWN',
  label: 'Bicycle Speed',
  options: [{
    text: '6 MPH',
    value: 2.68
  }, {
    text: '8 MPH',
    value: 3.58
  }, {
    text: '10 MPH',
    value: 4.47
  }, {
    text: '12 MPH',
    value: 5.36
  }]
}];

exports.default = queryParams;
module.exports = exports['default'];

//# sourceMappingURL=query-params.js