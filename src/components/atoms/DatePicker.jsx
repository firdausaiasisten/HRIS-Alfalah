// src/components/atoms/DatePicker.jsx
import Input from './Input'

// Deliberately wraps the native <input type="date"> rather than building a
// custom calendar-popup widget: native date inputs come with full keyboard
// navigation, screen-reader support, and OS-native picker UI for free,
// which is exactly what WCAG AA (brief section 13) asks for -- a custom
// widget would need to reimplement all of that correctly to match.
export default function DatePicker(props) {
  return <Input type="date" {...props} />
}
