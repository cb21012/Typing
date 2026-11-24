function formatTime(seconds, short=true) {
    const s = short, j = clang===1;
    const Y = s ? "y" : j ? "年" : "years, ", D = s ? "d" : j ? "日" : "day", H = s ? "h" : j ? "時間" : "hr ", M = s ? "m" : j ? "分" : "min ", S = s ? "s" : j ? "秒" : "sec";
    if (seconds>31536e4) return `${Math.floor(seconds / 31536e3)}${Y}${Math.floor((seconds % 31536e3) / 86400)}${D}${!j?((seconds % 31536e3)/86400)>2?"s":"":""}`;
    if (seconds>864e3) return `${Math.floor(seconds / 86400)}${D}${j?"":"s "}${String(Math.floor((seconds % 86400) / 3600)).padStart(2, '0')}${H}`;
    if (seconds>36e3) return `${Math.floor(seconds / 3600)}${H}${String(Math.floor((seconds/60) % 60)).padStart(2, '0')}${M}`;
    if (seconds>600) return `${Math.floor(seconds / 60)}${M}${String(Math.floor(seconds % 60)).padStart(2, '0')}${S}`;
    if (seconds>10) return `${Math.floor(seconds)}.${String(Math.floor((seconds * 100)%100)).padStart(2, '0')}${S}`;
    return `${Math.floor(seconds*1000)}ms`;
}