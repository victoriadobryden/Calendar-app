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
  '#4a90d9', '#e74c3c', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
  '#e91e63', '#00bcd4',
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

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Track last mousedown position for popup placement
let lastMousePos = { x: 200, y: 200 };
document.addEventListener('mousedown', (e) => {
  lastMousePos = { x: e.clientX, y: e.clientY };
});

function calcPopupPos(x, y) {
  const W = 290, H = 340;
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = x + 12, top = y + 12;
  if (left + W > vw) left = x - W - 12;
  if (top + H > vh) top = y - H - 12;
  if (top < 8) top = 8;
  if (left < 8) left = 8;
  return { top, left };
}

// ── Layout algorithm: groups overlapping events into clusters,
//    assigns column positions within each cluster so simultaneous
//    events render side-by-side.
function computeEventLayout(events) {
  if (!events.length) return [];
  const sorted = [...events].sort((a, b) => +new Date(a.start) - +new Date(b.start));

  // Build clusters of overlapping events
  const clusters = [];
  let cluster = [sorted[0]];
  let maxEnd = +new Date(sorted[0].end);

  for (let i = 1; i < sorted.length; i++) {
    const ev = sorted[i];
    if (+new Date(ev.start) < maxEnd) {
      cluster.push(ev);
      maxEnd = Math.max(maxEnd, +new Date(ev.end));
    } else {
      clusters.push(cluster);
      cluster = [ev];
      maxEnd = +new Date(ev.end);
    }
  }
  clusters.push(cluster);

  const result = [];
  let rowOffset = 0;

  clusters.forEach((clusterEvents) => {
    const cols = [];
    const assigned = clusterEvents.map((ev) => {
      let c = 0;
      while (true) {
        if (!cols[c]) cols[c] = [];
        const overlaps = cols[c].some(
          (o) =>
            +new Date(o.start) < +new Date(ev.end) &&
            +new Date(o.end) > +new Date(ev.start)
        );
        if (!overlaps) {
          cols[c].push(ev);
          return { event: ev, col: c };
        }
        c++;
      }
    });
    const numCols = cols.length;
    assigned.forEach(({ event, col }) => {
      result.push({ event, col, numCols, row: rowOffset });
    });
    rowOffset++;
  });

  return result;
}

// ── Custom Month View ──────────────────────────────────────────────
function CustomMonthView({ currentDate, events, onSelectSlot, onSelectEvent, onEventDrop }) {
  const [draggingEvent, setDraggingEvent] = useState(null);

  const month = moment(currentDate).month();
  const startOfGrid = moment(currentDate).startOf('month').startOf('week');
  const endOfGrid = moment(currentDate).endOf('month').endOf('week');

  const days = [];
  let d = startOfGrid.clone();
  while (d.isSameOrBefore(endOfGrid, 'day')) {
    days.push(d.clone());
    d.add(1, 'day');
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const getEventsForDay = (day) =>
    events
      .filter((ev) => moment(ev.start).isSame(day, 'day'))
      .sort((a, b) => +new Date(a.start) - +new Date(b.start));

  const handleDrop = (day) => {
    if (!draggingEvent) return;
    const ev = draggingEvent;
    const duration = +new Date(ev.end) - +new Date(ev.start);
    const newStart = day
      .clone()
      .hours(moment(ev.start).hours())
      .minutes(moment(ev.start).minutes())
      .seconds(0)
      .toDate();
    const newEnd = new Date(+newStart + duration);
    onEventDrop({ event: ev, start: newStart, end: newEnd });
    setDraggingEvent(null);
  };

  return (
    <div className="cmv-root">
      {/* Column headers */}
      <div className="cmv-header-row">
        {DAY_LABELS.map((l) => (
          <div key={l} className="cmv-header-cell">{l}</div>
        ))}
      </div>

      {/* Week rows */}
      <div className="cmv-body">
        {weeks.map((week, wi) => (
          <div key={wi} className="cmv-week-row">
            {week.map((day, di) => {
              const dayEvents = getEventsForDay(day);
              const layout = computeEventLayout(dayEvents);
              const numRows = layout.length > 0 ? Math.max(...layout.map((l) => l.row)) + 1 : 0;
              const isOtherMonth = day.month() !== month;
              const isToday = day.isSame(moment(), 'day');

              return (
                <div
                  key={di}
                  className={
                    'cmv-day-cell' +
                    (isOtherMonth ? ' cmv-off-month' : '') +
                    (isToday ? ' cmv-today' : '')
                  }
                  onClick={() => onSelectSlot({ start: day.toDate(), end: day.toDate() })}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(day)}
                >
                  <div className="cmv-date-num">
                    <span className={isToday ? 'cmv-today-badge' : ''}>{day.date()}</span>
                  </div>

                  <div
                    className="cmv-events-area"
                    style={{ height: numRows > 0 ? numRows * 22 + 2 : 0 }}
                  >
                    {layout.map(({ event, col, numCols, row }) => (
                      <div
                        key={event.id}
                        className="cmv-event"
                        draggable
                        style={{
                          top: row * 22,
                          left: `calc(${(col / numCols) * 100}% + 1px)`,
                          width: `calc(${(1 / numCols) * 100}% - 2px)`,
                          backgroundColor: event.color || '#4a90d9',
                        }}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          setDraggingEvent(event);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(event);
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Event View Popup ───────────────────────────────────────────────
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

// ── Quick-Add Popup ────────────────────────────────────────────────
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
            <input type="text" value={moment(slot.start).format('MM/DD/YYYY')} readOnly style={{ background: '#f9f9f9' }} />
            <span className="input-icon">📅</span>
          </div>
        </div>

        <div className="popup-field">
          <label>Event Time</label>
          <div className="popup-input-icon">
            <input type="text" value={moment(slot.start).format('h:mm A')} readOnly style={{ background: '#f9f9f9' }} />
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
          <button
            className="btn-edit"
            onClick={() =>
              onOpenFull({
                id: uuidv4(),
                title: title.trim(),
                start: slot.start,
                end: moment(slot.start).add(1, 'hour').toDate(),
                color,
              })
            }
          >
            EDIT
          </button>
        </div>
      </div>
    </>
  );
}

// ── Full Event Form Modal ──────────────────────────────────────────
function EventFormModal({ event, onClose, onSave }) {
  const isEdit = !!(event && event._isExisting);
  const [title, setTitle] = useState(event ? event.title : '');
  const [date, setDate] = useState(event ? moment(event.start).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'));
  const [startTime, setStartTime] = useState(event ? moment(event.start).format('HH:mm') : '09:00');
  const [endTime, setEndTime] = useState(event ? moment(event.end).format('HH:mm') : '10:00');
  const [color, setColor] = useState(event ? event.color || COLORS[0] : COLORS[0]);
  const [errors, setErrors] = useState({});

  const handleSave = () => {
    const e = {};
    if (!title.trim()) e.title = true;
    if (!date) e.date = true;
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    const start = moment(`${date} ${startTime}`).toDate();
    let end = moment(`${date} ${endTime}`).toDate();
    if (end <= start) end = moment(`${date} ${startTime}`).add(1, 'hour').toDate();
    onSave({ id: event ? event.id : uuidv4(), title: title.trim().slice(0, 30), start, end, color });
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
          <div className={`char-count ${title.length >= 30 ? 'over' : ''}`}>{title.length}/30</div>
        </div>

        <div className="modal-field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setErrors({}); }} className={errors.date ? 'error' : ''} />
        </div>

        <div className="modal-field">
          <label>Start Time</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>

        <div className="modal-field">
          <label>End Time</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
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

// ── Main App ───────────────────────────────────────────────────────
function App() {
  const [events, setEvents] = useState([
    { id: uuidv4(), title: 'Event name', start: new Date(2018,0,4,10,0),  end: new Date(2018,0,4,11,0),  color: '#4a90d9' },
    { id: uuidv4(), title: 'Event name', start: new Date(2018,0,5,9,0),   end: new Date(2018,0,5,10,0),  color: '#4a90d9' },
    { id: uuidv4(), title: 'Event name', start: new Date(2018,0,5,14,0),  end: new Date(2018,0,5,15,0),  color: '#4a90d9' },
    { id: uuidv4(), title: 'Event name', start: new Date(2018,0,14,9,0),  end: new Date(2018,0,14,10,0), color: '#4a90d9' },
    { id: uuidv4(), title: 'Event name', start: new Date(2018,0,19,9,0),  end: new Date(2018,0,19,10,0), color: '#4a90d9' },
    { id: uuidv4(), title: 'Event name', start: new Date(2018,0,28,9,0),  end: new Date(2018,0,28,10,0), color: '#4a90d9' },
    { id: uuidv4(), title: 'Event name', start: new Date(2018,0,29,9,0),  end: new Date(2018,0,29,10,0), color: '#4a90d9' },
  ]);

  const [currentDate, setCurrentDate] = useState(new Date(2018, 0, 1));
  const [currentView, setCurrentView] = useState('month');

  const [viewPopup, setViewPopup] = useState({ event: null, pos: { top: 0, left: 0 } });
  const [slotPopup, setSlotPopup] = useState({ slot: null, pos: { top: 0, left: 0 } });
  const [modal, setModal] = useState({ open: false, event: null });

  const handleNavigate = (action) => {
    setCurrentDate((prev) => {
      const m = moment(prev);
      if (action === 'TODAY') return new Date(2018, 0, 1);
      if (action === 'PREV') {
        if (currentView === 'week') return m.subtract(1, 'week').toDate();
        if (currentView === 'day') return m.subtract(1, 'day').toDate();
        return m.subtract(1, 'month').toDate();
      }
      if (action === 'NEXT') {
        if (currentView === 'week') return m.add(1, 'week').toDate();
        if (currentView === 'day') return m.add(1, 'day').toDate();
        return m.add(1, 'month').toDate();
      }
      return prev;
    });
  };

  const getToolbarTitle = () => {
    const m = moment(currentDate);
    if (currentView === 'month') return m.format('MMMM YYYY');
    if (currentView === 'week') {
      const s = m.clone().startOf('week');
      const e = m.clone().endOf('week');
      return `${s.format('MMM D')} – ${e.format('MMM D, YYYY')}`;
    }
    if (currentView === 'day') return m.format('dddd, MMM D, YYYY');
    return m.format('MMMM YYYY');
  };

  const openSlotPopup = (slot) => {
    const pos = calcPopupPos(lastMousePos.x, lastMousePos.y);
    setSlotPopup({ slot, pos });
    setViewPopup({ event: null, pos: { top: 0, left: 0 } });
  };

  const openViewPopup = (event) => {
    const pos = calcPopupPos(lastMousePos.x, lastMousePos.y);
    setViewPopup({ event, pos });
    setSlotPopup({ slot: null, pos: { top: 0, left: 0 } });
  };

  const handleSelectSlot = useCallback((slotInfo) => openSlotPopup(slotInfo), []);
  const handleSelectEvent = useCallback((event) => openViewPopup(event), []);

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
      if (exists) return prev.map((e) => (e.id === eventData.id ? eventData : e));
      return [...prev, eventData];
    });
    setModal({ open: false, event: null });
  };

  const handleEventDrop = useCallback(({ event, start, end }) => {
    setEvents((prev) => prev.map((ev) => (ev.id === event.id ? { ...ev, start, end } : ev)));
  }, []);

  const handleEventResize = useCallback(({ event, start, end }) => {
    setEvents((prev) => prev.map((ev) => (ev.id === event.id ? { ...ev, start, end } : ev)));
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

        <div className="page-content">
          <div className="page-title">Calendar</div>

          <div className={`calendar-wrapper${currentView !== 'month' ? ' time-grid-view' : ''}`}>
            {/* Toolbar */}
            <div className="calendar-toolbar">
              <div className="calendar-toolbar-left">
                <span style={{ fontSize: 13, fontWeight: 600, color: '#555', marginRight: 4 }}>
                  Calendar View
                </span>
                <button className="toolbar-btn" onClick={() => handleNavigate('TODAY')}>Today</button>
                <button className="toolbar-btn" onClick={() => handleNavigate('PREV')}>Back</button>
                <button className="toolbar-btn" onClick={() => handleNavigate('NEXT')}>Next</button>
              </div>

              <span className="calendar-toolbar-title">{getToolbarTitle()}</span>

              <div className="calendar-toolbar-right">
                <div className="view-btns">
                  {['month', 'week', 'day', 'agenda'].map((v) => (
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
            </div>

            {/* Month: custom grid with side-by-side simultaneous events */}
            {currentView === 'month' && (
              <CustomMonthView
                currentDate={currentDate}
                events={sortedEvents}
                onSelectSlot={openSlotPopup}
                onSelectEvent={openViewPopup}
                onEventDrop={handleEventDrop}
              />
            )}

            {/* Week / Day / Agenda: react-big-calendar handles side-by-side natively */}
            {currentView !== 'month' && (
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
            )}
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

      {/* Quick-Add Slot Popup */}
      {slotPopup.slot && (
        <QuickAddPopup
          slot={slotPopup.slot}
          pos={slotPopup.pos}
          onClose={() => setSlotPopup({ slot: null, pos: { top: 0, left: 0 } })}
          onSaveQuick={handleSaveQuick}
          onOpenFull={handleOpenFullFromSlot}
        />
      )}

      {/* Edit / Add Modal */}
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
