import React, {PropTypes, Component} from 'react'

import { getModeIcon } from '../../util/itinerary'

export default class ModeButton extends Component {
  static propTypes = {
    active: PropTypes.bool,
    label: PropTypes.string,
    mode: PropTypes.any, // currently a mode object or string
    icons: PropTypes.object,
    onClick: PropTypes.func
  }

  render () {
    const {active, icons, label, mode, onClick} = this.props
    const buttonColor = active ? '#000' : '#bbb'
    return (
      <div className='mode-button-container'>
        <button
          className='mode-button'
          onClick={onClick}
          title={label}
          style={{ borderColor: buttonColor }}
        >
          <div
            className='mode-icon'
            style={{ fill: buttonColor }}>
            {getModeIcon(mode, icons)}
          </div>
        </button>
        <div className='mode-label' style={{ color: buttonColor }}>{label}</div>
        {active && <div>
          <div className='mode-check' style={{ color: 'white' }}><i className='fa fa-circle' /></div>
          <div className='mode-check' style={{ color: 'green' }}><i className='fa fa-check-circle' /></div>
        </div>}
      </div>
    )
  }
}
