"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("core-js/modules/es7.symbol.async-iterator");

require("core-js/modules/es6.symbol");

require("core-js/modules/es6.regexp.match");

var _coreUtils = _interopRequireDefault(require("@opentripplanner/core-utils"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _react = _interopRequireWildcard(require("react"));

var _reactBootstrap = require("react-bootstrap");

var _reactRedux = require("react-redux");

var _messages = require("../../util/messages");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var SettingsPreview =
/*#__PURE__*/
function (_Component) {
  _inherits(SettingsPreview, _Component);

  function SettingsPreview() {
    _classCallCheck(this, SettingsPreview);

    return _possibleConstructorReturn(this, _getPrototypeOf(SettingsPreview).apply(this, arguments));
  }

  _createClass(SettingsPreview, [{
    key: "render",
    value: function render() {
      var _this$props = this.props,
          caret = _this$props.caret,
          config = _this$props.config,
          query = _this$props.query,
          editButtonText = _this$props.editButtonText;
      var messages = (0, _messages.mergeMessages)(SettingsPreview.defaultProps, this.props); // Show dot indicator if the current query differs from the default query.

      var showDot = _coreUtils.default.query.isNotDefaultQuery(query, config);

      var button = _react.default.createElement("div", {
        className: "button-container"
      }, _react.default.createElement(_reactBootstrap.Button, {
        onClick: this.props.onClick
      }, editButtonText, caret && _react.default.createElement("span", null, " ", _react.default.createElement("i", {
        className: "fa fa-caret-".concat(caret)
      }))), showDot && _react.default.createElement("div", {
        className: "dot"
      })); // Add tall class to account for vertical centering if there is only
      // one line in the label (default is 2).


      var addClass = messages.label.match(/\n/) ? '' : ' tall';
      return _react.default.createElement("div", {
        className: "settings-preview",
        onClick: this.props.onClick
      }, _react.default.createElement("div", {
        className: "summary".concat(addClass)
      }, messages.label), button, _react.default.createElement("div", {
        style: {
          clear: 'both'
        }
      }));
    }
  }]);

  return SettingsPreview;
}(_react.Component);

_defineProperty(SettingsPreview, "propTypes", {
  // component props
  caret: _propTypes.default.string,
  compressed: _propTypes.default.bool,
  editButtonText: _propTypes.default.element,
  showCaret: _propTypes.default.bool,
  onClick: _propTypes.default.func,
  // application state
  companies: _propTypes.default.string,
  modeGroups: _propTypes.default.array,
  queryModes: _propTypes.default.array
});

_defineProperty(SettingsPreview, "defaultProps", {
  editButtonText: _react.default.createElement("i", {
    className: "fa fa-pencil"
  }),
  messages: {
    label: 'Transit Options\n& Preferences'
  }
});

var mapStateToProps = function mapStateToProps(state, ownProps) {
  return {
    config: state.otp.config,
    messages: state.otp.config.language.settingsPreview,
    query: state.otp.currentQuery
  };
};

var mapDispatchToProps = {};

var _default = (0, _reactRedux.connect)(mapStateToProps, mapDispatchToProps)(SettingsPreview);

exports.default = _default;
module.exports = exports.default;

//# sourceMappingURL=settings-preview.js