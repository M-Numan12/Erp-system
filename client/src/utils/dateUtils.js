/**
 * Utility functions for Pakistan standard date formatting (DD/MM/YYYY)
 */

// Formats any Date object, ISO string, or timestamp into Pakistan standard format: DD/MM/YYYY
export const formatDate = (dateInput) => {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return '-';
  }
};

// Formats Date with Time: DD/MM/YYYY, hh:mm AM/PM
export const formatDateTime = (dateInput) => {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    
    return `${day}/${month}/${year}, ${strHours}:${minutes} ${ampm}`;
  } catch (e) {
    return '-';
  }
};

// Formats HTML input date string (YYYY-MM-DD) to DD/MM/YYYY
export const formatInputDate = (yyyyMmDd) => {
  if (!yyyyMmDd) return '-';
  if (typeof yyyyMmDd === 'string' && yyyyMmDd.includes('-')) {
    const parts = yyyyMmDd.split('T')[0].split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return formatDate(yyyyMmDd);
};
