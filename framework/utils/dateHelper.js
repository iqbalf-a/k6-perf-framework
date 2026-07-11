function formatDate(date, format) {
    const d = new Date(date);

    const yyyy = d.getFullYear();
    const yy   = String(yyyy).slice(-2);
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    const hh   = String(d.getHours()).padStart(2, '0');
    const min  = String(d.getMinutes()).padStart(2, '0');
    const ss   = String(d.getSeconds()).padStart(2, '0');

    const monthNames     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthFullNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const mmm  = monthNames[d.getMonth()];
    const mmmm = monthFullNames[d.getMonth()];

    const formats = {
        'YYYY/MM/DD'             : `${yyyy}/${mm}/${dd}`,
        'YYYY-MM-DD'             : `${yyyy}-${mm}-${dd}`,
        'YYYY.MM.DD'             : `${yyyy}.${mm}.${dd}`,
        'DD/MM/YYYY'             : `${dd}/${mm}/${yyyy}`,
        'DD-MM-YYYY'             : `${dd}-${mm}-${yyyy}`,
        'MM/DD/YYYY'             : `${mm}/${dd}/${yyyy}`,
        'MM-DD-YYYY'             : `${mm}-${dd}-${yyyy}`,
        'YYYYMMDD'               : `${yyyy}${mm}${dd}`,
        'YY-MM-DD'               : `${yy}-${mm}-${dd}`,
        'DD-MM-YY'               : `${dd}-${mm}-${yy}`,
        'DD MMM YYYY'            : `${dd} ${mmm} ${yyyy}`,
        'DD MMMM YYYY'           : `${dd} ${mmmm} ${yyyy}`,
        'MMM DD, YYYY'           : `${mmm} ${dd}, ${yyyy}`,
        'MMMM DD, YYYY'          : `${mmmm} ${dd}, ${yyyy}`,
        'DD-MMM-YYYY'            : `${dd}-${mmm}-${yyyy}`,
        'DD/MMM/YYYY'            : `${dd}/${mmm}/${yyyy}`,
        'YYYY'                   : `${yyyy}`,
        'YY'                     : `${yy}`,
        'MM'                     : `${mm}`,
        'MMM'                    : `${mmm}`,
        'MMMM'                   : `${mmmm}`,
        'DD'                     : `${dd}`,
        'YYYY-MM'                : `${yyyy}-${mm}`,
        'YYYY/MM'                : `${yyyy}/${mm}`,
        'YYYY-MM-DD HH:mm:ss'    : `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`,
        'YYYY-MM-DDTHH:mm:ss'    : `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`,
        'YYYY-MM-DDTHH:mm:ss+07:00': `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}+07:00`,
        'START_OF_DAY'           : `${yyyy}-${mm}-${dd}T00:00:00`,
        'END_OF_DAY'             : `${yyyy}-${mm}-${dd}T23:59:59`,
        'START_OF_DAY_TZ'        : `${yyyy}-${mm}-${dd}T00:00:00+07:00`,
        'END_OF_DAY_TZ'          : `${yyyy}-${mm}-${dd}T23:59:59+07:00`,
    };

    if (!formats[format]) {
        console.warn(`[dateHelper] Format "${format}" tidak dikenali. Menggunakan YYYY/MM/DD.`);
        return formats['YYYY/MM/DD'];
    }
    return formats[format];
}

function shiftDate(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d;
}

export const today        = (fmt = 'YYYY/MM/DD') => formatDate(new Date(), fmt);
export const todaySTR     = (fmt = 'DD MMM YYYY') => formatDate(new Date(), fmt);
export const yesterday    = (fmt = 'YYYY/MM/DD') => formatDate(shiftDate(-1), fmt);
export const yesterdaySTR = (fmt = 'DD MMM YYYY') => formatDate(shiftDate(-1), fmt);
export const monthBefore  = (fmt = 'YYYY/MM/DD') => formatDate(shiftDate(-30), fmt);
export const yearBefore   = (fmt = 'YYYY/MM/DD') => formatDate(shiftDate(-365), fmt);
export const month        = (fmt = 'MM')          => formatDate(new Date(), fmt);
export const year         = (fmt = 'YYYY')        => formatDate(new Date(), fmt);
export const daysAgo      = (n, fmt = 'YYYY/MM/DD') => formatDate(shiftDate(-n), fmt);
export const daysAhead    = (n, fmt = 'YYYY/MM/DD') => formatDate(shiftDate(n), fmt);
export const customDate   = (date, fmt = 'YYYY/MM/DD') => formatDate(date, fmt);

export function startOfYear(fmt = 'YYYY/MM/DD')  { const d = new Date(); d.setMonth(0);  d.setDate(1);  return formatDate(d, fmt); }
export function endOfYear(fmt = 'YYYY/MM/DD')    { const d = new Date(); d.setMonth(11); d.setDate(31); return formatDate(d, fmt); }
export function startOfMonth(fmt = 'YYYY/MM/DD') { const d = new Date(); d.setDate(1);                  return formatDate(d, fmt); }
export function endOfMonth(fmt = 'YYYY/MM/DD')   { const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(0); return formatDate(d, fmt); }
