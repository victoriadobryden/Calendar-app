import React, { useState, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './App.css';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

const COLORS = [
  '#4a90d9',
  '#e74c3c',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#34495e',
  '#e91e63',
  '#00bcd4',
];

const NAV_ITEMS = [
  { label: 'Home', icon: '⌂' },
  { label: 'Dashboard', icon: '▤' },
  { label: 'Inbox', icon: '✉' },
  { label: 'Products', icon: '▦' },
  { label: 'Invoices', icon: '📋' },
  { label: 'Customers', icon: '👤' },
  { label: 'Chat Room', icon: '💬' },
  { label: 'Calendar', icon: '📅', active: true },
  { label: 'Help Center', icon: '❓' },
  { label: 'Settings', icon: '⚙' },
];

// Track last mouse position globally
let lastMousePos = { x: 0, y: 0 };
document.addEventListener('mousedown', (e) => {
  lastMousePos = { x: e.clientX, y: e.clientY };
});

function calcPopupPos(x, y) {
  const popupW = 290;
  const popupH = 320;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = x + 12;
  let top = y + 12;
  if (left + popupW > vw) left = x - popupW - 12;
  if (top + popupH > vh) top = y - popupH - 12;
  if (top < 8) top = 8;
  if (left < 8) left = 8;
  return { top, left };
}

// ---- EventViewPopup (shown when clicking an existing event) ----
function EventViewPopup({ event, pos, onClose, onDelete, onEdit }) {
  if (!event) return null;
  return (
    <>
      <div className="popup-overlay" onClick={onClose} />
      <div className="event-popup" style={{ top: pos.top, left: pos.left }}>
        <div className="event-popup-header">
          <span className="event-popup-title" style={{ color: event.color || '#4a90d9' }}>
            {event.title}
          </span>
          <button className="popup-close-btn" onClick={onClose}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
          {moment(event.start).format('MM/DD/YYYY')}
        </div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
          {moment(event.start).format('h:mm A')} – {moment(event.end).format('h:mm A')}
        </div>
        <div style={{ fontSize: 12, color: '#bbb', marginBottom: 14 }}>
          Lorem ipsum dolor sit amet
        </div>
        <div className="popup-actions">
          <button className="btn-discard" onClick={() => onDelete(event.id)}>DISCARD</button>
          <button className="btn-edit" onClick={() => onEdit(event)}>EDIT</button>
        </div>
      </div>
    </>
  );
}

// ---- QuickAddPopup (shown when clicking empty slot) ----
function QuickAddPopup({ slot, pos, onClose, onSaveQuick, onOpenFull }) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  if (!slot) return null;

  const handleQuickSave = () => {
    if (!title.trim()) return;
    onSaveQuick({
      id: uuidv4(),
      title: title.trim().slice(0, 30),
      start: slot.start,
      end: moment(slot.start).add(1, 'hour').toDate(),
      color,
    });
  };

  const handleEdit = () => {
    onOpenFull({
      id: uuidv4(),
      title: title.trim(),
      start: slot.start,
      end: moment(slot.start).add(1, 'hour').toDate(),
      color,
    });
  };

  return (
    <>
      <div className="popup-overlay" onClick={onClose} />
      <div className="event-popup" style={{ top: pos.top, left: pos.left }}>
        <div className="event-popup-header">
          <span className="event-popup-title">Add Event</span>
          <button className="popup-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="popup-field">
          <label>Event Name</label>
          <div className="popup-input-icon">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event name"
              maxLength={30}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleQuickSave()}
            />
          </div>
          <div className={`char-count ${title.length >= 30 ? 'over' : ''}`}>
            {title.length}/30
          </div>
        </div>

        <div className="popup-field">
          <label>Date</label>
          <div className="popup-input-icon">
            <input
              type="text"
              value={moment(slot.start).format('MM/DD/YYYY')}
              readOnly
              style={{ background: '#f9f9f9' }}
            />
            <span className="input-icon">📅</span>
          </div>
        </div>

        <div className="popup-field">
          <label>Event Time</label>
          <div className="popup-input-icon">
            <input
              type="text"
              value={moment(slot.start).format('h:mm A')}
              readOnly
              style={{ background: '#f9f9f9' }}
            />
            <span className="input-icon">🕐</span>
          </div>
        </div>

        <div className="popup-field">
          <label>Color</label>
          <div className="color-picker-row">
            {COLORS.map((c) => (
              <div
                key={c}
                className={`color-swatch ${color === c ? 'selected' : ''}`}
                style={{ background: c, width: 18, height: 18 }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#bbb', marginBottom: 8 }}>
          Lorem ipsum dolor sit me
        </div>

        <div className="popup-actions">
          <button className="btn-discard" onClick={onClose}>DISCARD</button>
          <button className="btn-edit" onClick={handleEdit}>EDIT</button>
        </div>
      </div>
    </>
  );
}

// ---- Full Event Form Modal ----
function EventFormModal({ event, onClose, onSave }) {
  const isEdit = !!(event && event.id && event._isExisting);
  const [title, setTitle] = useState(event ? event.title : '');
  const [date, setDate] = useState(
    event ? moment(event.start).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD')
  );
  const [startTime, setStartTime] = useState(
    event ? moment(event.start).format('HH:mm') : '09:00'
  );
  const [endTime, setEndTime] = useState(
    event ? moment(event.end).format('HH:mm') : '10:00'
  );
  const [color, setColor] = useState(event ? event.color || COLORS[0] : COLORS[0]);
  const [errors, setErrors] = useState({});

  const handleSave = () => {
    const e = {};
    if (!title.trim()) e.title = true;
    if (!date) e.date = true;
    if (!startTime) e.startTime = true;
    if (!endTime) e.endTime = true;
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    const start = moment(`${date} ${startTime}`).toDate();
    let end = moment(`${date} ${endTime}`).toDate();
    if (end <= start) end = moment(`${date} ${startTime}`).add(1, 'hour').toDate();

    onSave({
      id: event ? event.id : uuidv4(),
      title: title.trim().slice(0, 30),
      start,
      end,
      color,
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="event-modal">
        <h3>{isEdit ? 'Edit Event' : 'New Event'}</h3>

        <div className="modal-field">
          <label>Event Name</label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setErrors({}); }}
            placeholder="Event name (max 30 chars)"
            maxLength={30}
            className={errors.title ? 'error' : ''}
            autoFocus
          />
          <div className={`char-count ${title.length >= 30 ? 'over' : ''}`}>
            {title.length}/30
          </div>
        </div>

        <div className="modal-field">
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setErrors({}); }}
            className={errors.date ? 'error' : ''}
          />
        </div>

        <div className="modal-field">
          <label>Start Time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => { setStartTime(e.target.value); setErrors({}); }}
            className={errors.startTime ? 'error' : ''}
          />
        </div>

        <div className="modal-field">
          <label>End Time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => { setEndTime(e.target.value); setErrors({}); }}
            className={errors.endTime ? 'error' : ''}
          />
        </div>

        <div className="modal-field">
          <label>Color</label>
          <div className="color-picker-row">
            {COLORS.map((c) => (
              <div
                key={c}
                className={`color-swatch ${color === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ---- Main App ----
function App() {
  const [events, setEvents] = useState([
    { id: uuidv4(), title: 'Event name', start: new Date(2018,0,4,10,0), end: new Date(2018,0,4,11,0), color: '#4a90d9' },
    { id: uuidv4(), title: 'Event name', start: new Date(2018,0,5,9,0),  end: new Date(2018,0,5,10,0), color: '#4a90d9' },
    { id: uuidv4(), title: 'Event name', start: new Date(2018,0,5,14,0), end: new Date(2018,0,5,15,0), color: '#4a90d9' },
    { id: uuidv4(), title: 'Event name', start: new Date(2018,0,14,9,0), end: new Date(2018,0,14,10,0),color: '#4a90d9' },
    { id: uuidv4(), title: 'Event name', start: new Date(2018,0,19,9,0), end: new Date(2018,0,19,10,0),color: '#4a90d9' },
    { id: uuidv4(), title: 'Event name', start: new Date(2018,0,28,9,0), end: new Date(2018,0,28,10,0),color: '#4a90d9' },
    { id: uuidv4(), title: 'Event name', start: new Date(2018,0,29,9,0), end: new Date(2018,0,29,10,0),color: '#4a90d9' },
  ]);

  const [currentDate, setCurrentDate] = useState(new Date(2018, 0, 1));
  const [currentView, setCurrentView] = useState('month');

  // Event view popup
  const [viewPopup, setViewPopup] = useState({ event: null, pos: { top: 0, left: 0 } });
  // Quick-add slot popup
  const [slotPopup, setSlotPopup] = useState({ slot: null, pos: { top: 0, left: 0 } });
  // Full edit modal
  const [modal, setModal] = useState({ open: false, event: null });

  const handleNavigate = (action) => {
    setCurrentDate((prev) => {
      const m = moment(prev);
      if (action === 'TODAY') return new Date(2018, 0, 1); // reset to design date
      if (action === 'PREV') {
        if (currentView === 'month') return m.subtract(1, 'month').toDate();
        if (currentView === 'week') return m.subtract(1, 'week').toDate();
        if (currentView === 'day')  return m.subtract(1, 'day').toDate();
        return m.subtract(1, 'month').toDate();
      }
      if (action === 'NEXT') {
        if (currentView === 'month') return m.add(1, 'month').toDate();
        if (currentView === 'week')  return m.add(1, 'week').toDate();
        if (currentView === 'day')   return m.add(1, 'day').toDate();
        return m.add(1, 'month').toDate();
      }
      return prev;
    });
  };

  const getToolbarTitle = () => {
    const m = moment(currentDate);
    if (currentView === 'month')  return m.format('MMMM YYYY');
    if (currentView === 'week') {
      const s = m.clone().startOf('week');
      const e = m.clone().endOf('week');
      return `${s.format('MMM D')} – ${e.format('MMM D, YYYY')}`;
    }
    if (currentView === 'day')   return m.format('dddd, MMM D, YYYY');
    return m.format('MMMM YYYY');
  };

  const handleSelectSlot = useCallback((slotInfo) => {
    const pos = calcPopupPos(lastMousePos.x, lastMousePos.y);
    setSlotPopup({ slot: slotInfo, pos });
    setViewPopup({ event: null, pos: { top: 0, left: 0 } });
  }, []);

  const handleSelectEvent = useCallback((event) => {
    const pos = calcPopupPos(lastMousePos.x, lastMousePos.y);
    setViewPopup({ event, pos });
    setSlotPopup({ slot: null, pos: { top: 0, left: 0 } });
  }, []);

  const handleDeleteEvent = (id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setViewPopup({ event: null, pos: { top: 0, left: 0 } });
  };

  const handleEditClick = (event) => {
    setModal({ open: true, event: { ...event, _isExisting: true } });
    setViewPopup({ event: null, pos: { top: 0, left: 0 } });
  };

  const handleOpenFullFromSlot = (initial) => {
    setModal({ open: true, event: initial });
    setSlotPopup({ slot: null, pos: { top: 0, left: 0 } });
  };

  const handleSaveQuick = (newEvent) => {
    setEvents((prev) => [...prev, newEvent]);
    setSlotPopup({ slot: null, pos: { top: 0, left: 0 } });
  };

  const handleSaveModal = (eventData) => {
    setEvents((prev) => {
      const exists = prev.find((e) => e.id === eventData.id);
      if (exists) return prev.map((e) => e.id === eventData.id ? eventData : e);
      return [...prev, eventData];
    });
    setModal({ open: false, event: null });
  };

  const handleEventDrop = useCallback(({ event, start, end }) => {
    setEvents((prev) =>
      prev.map((ev) => ev.id === event.id ? { ...ev, start, end } : ev)
    );
  }, []);

  const handleEventResize = useCallback(({ event, start, end }) => {
    setEvents((prev) =>
      prev.map((ev) => ev.id === event.id ? { ...ev, start, end } : ev)
    );
  }, []);

  const eventStyleGetter = (event) => ({
    style: {
      backgroundColor: event.color || '#4a90d9',
      border: 'none',
      borderRadius: '3px',
      color: '#fff',
      fontSize: '12px',
      fontWeight: 500,
    },
  });

  const sortedEvents = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">IMPEKABLE</div>
        <nav className="sidebar-nav">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.label} className={item.active ? 'active' : ''}>
                <div className="nav-item">
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main */}
      <div className="main-area">
        {/* Top Header */}
        <header className="top-header">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Search transactions, invoices or help" />
          </div>
          <div className="header-actions">
            <span className="header-icon">🌐</span>
            <span className="header-icon">🔍</span>
            <span className="header-icon">🔔</span>
            <div className="user-info">
              <span>John Doe</span>
              <div className="user-avatar">JD</div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          <div className="page-title">Calendar</div>

          <div className="calendar-wrapper">
            {/* Custom Toolbar */}
            <div className="calendar-toolbar">
              <div style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>
                Calendar View
              </div>
              <div className="calendar-toolbar-left">
                <button className="toolbar-btn" onClick={() => handleNavigate('TODAY')}>Today</button>
                <button className="toolbar-btn" onClick={() => handleNavigate('PREV')}>Back</button>
                <button className="toolbar-btn" onClick={() => handleNavigate('NEXT')}>Next</button>
                <span className="calendar-toolbar-title">{getToolbarTitle()}</span>
              </div>
              <div className="view-btns">
                {['month','week','day','agenda'].map((v) => (
                  <button
                    key={v}
                    className={`view-btn ${currentView === v ? 'active' : ''}`}
                    onClick={() => setCurrentView(v)}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar */}
            <DnDCalendar
              localizer={localizer}
              events={sortedEvents}
              date={currentDate}
              view={currentView}
              onNavigate={setCurrentDate}
              onView={setCurrentView}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              selectable
              resizable
              eventPropGetter={eventStyleGetter}
              toolbar={false}
              style={{ flex: 1, minHeight: 0 }}
              popup
            />
          </div>
        </div>
      </div>

      {/* Event View Popup */}
      {viewPopup.event && (
        <EventViewPopup
          event={viewPopup.event}
          pos={viewPopup.pos}
          onClose={() => setViewPopup({ event: null, pos: { top: 0, left: 0 } })}
          onDelete={handleDeleteEvent}
          onEdit={handleEditClick}
        />
      )}

      {/* Quick Add Popup */}
      {slotPopup.slot && (
        <QuickAddPopup
          slot={slotPopup.slot}
          pos={slotPopup.pos}
          onClose={() => setSlotPopup({ slot: null, pos: { top: 0, left: 0 } })}
          onSaveQuick={handleSaveQuick}
          onOpenFull={handleOpenFullFromSlot}
        />
      )}

      {/* Full Edit/Add Modal */}
      {modal.open && (
        <EventFormModal
          event={modal.event}
          onClose={() => setModal({ open: false, event: null })}
          onSave={handleSaveModal}
        />
      )}
    </div>
  );
}

export default App;
