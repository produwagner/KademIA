import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Bloqueia cópia e recorte de texto fora de campos editáveis (inputs/textareas)
const preventCopyCut = (e) => {
  const target = e.target;
  const isEditable = 
    target.tagName === 'INPUT' || 
    target.tagName === 'TEXTAREA' || 
    target.isContentEditable;
    
  if (!isEditable) {
    e.preventDefault();
  }
};

document.addEventListener('copy', preventCopyCut);
document.addEventListener('cut', preventCopyCut);

// Impedir zoom por gesto de pinça (pinch-to-zoom) no iOS/Safari
document.addEventListener('gesturestart', (e) => {
  e.preventDefault();
});

// Impedir zoom por gesto de pinça (pinch-to-zoom) no Android/Chrome/Firefox
document.addEventListener('touchstart', (e) => {
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
