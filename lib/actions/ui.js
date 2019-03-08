import { createAction } from 'redux-actions'

export const setMobileScreen = createAction('SET_MOBILE_SCREEN')

export const setMainPanelContent = createAction('SET_MAIN_PANEL_CONTENT')

// Stop/Route/Trip Viewer actions

export const setViewedStop = createAction('SET_VIEWED_STOP')

export const setViewedTrip = createAction('SET_VIEWED_TRIP')

export const setViewedRoute = createAction('SET_VIEWED_ROUTE')

// UI state enums

export const MainPanelContent = {
  ROUTE_VIEWER: 1
}

export const MobileScreens = {
  WELCOME_SCREEN: 1,
  SET_INITIAL_LOCATION: 2,
  SEARCH_FORM: 3,
  SET_FROM_LOCATION: 4,
  SET_TO_LOCATION: 5,
  SET_OPTIONS: 6,
  SET_DATETIME: 7,
  RESULTS_SUMMARY: 8
}
