const COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#06b6d4','#84cc16','#f97316'];

export default function Avatar({ username = '?', avatarUrl, size = 'md', online = false, members }) {
  const cls = `av av-${size}`;
  const idx = (username || '?').charCodeAt(0) % COLORS.length;
  const bg = COLORS[idx];

  if (members && members.length >= 2) {
    return (
      <div className={`av av-${size}`} style={{ background: 'transparent', padding: 0 }}>
        <div className="av-group" style={{ width: '100%', height: '100%' }}>
          {members.slice(0, 4).map((m, i) => (
            <div key={i} className="av-group-cell" style={{ background: COLORS[m.username.charCodeAt(0) % COLORS.length] }}>
              {m.username[0].toUpperCase()}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const style = avatarUrl
    ? { backgroundImage: `url(${avatarUrl})`, fontSize: 0 }
    : { background: bg };

  return (
    <div className={cls} style={style}>
      {!avatarUrl && (username || '?')[0].toUpperCase()}
      {online && <span className="av-dot" />}
    </div>
  );
}
