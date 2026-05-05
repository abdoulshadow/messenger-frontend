export default function LocationBubble({ content, isMe }) {
  let lat, lng;
  try { const d = JSON.parse(content); lat = d.lat; lng = d.lng; } catch { return null; }

  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const imgUrl  = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=260x160&markers=${lat},${lng}&key=`;

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', cursor: 'pointer', maxWidth: 260 }} onClick={() => window.open(mapsUrl, '_blank')}>
      <div style={{ background: isMe ? 'rgba(255,255,255,0.15)' : 'var(--bg4)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Static map fallback with OpenStreetMap */}
        <iframe
          title="location"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lng}`}
          style={{ width: 260, height: 140, border: 'none', display: 'block', pointerEvents: 'none' }}
        />
        <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Localisation partagée</span>
          <span style={{ fontSize: 11, color: 'inherit', opacity: 0.7, marginLeft: 'auto' }}>Ouvrir →</span>
        </div>
      </div>
    </div>
  );
}
