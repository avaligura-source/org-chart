// Creative Team org chart — shared storage.
// Google Apps Script web app: keeps the chart as a JSON file on the owner's Google Drive.
// Deploy: Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.

const FILE_NAME = 'creative-team-org-chart.json';

function file_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FILE_ID');
  if (id) { try { return DriveApp.getFileById(id); } catch (e) {} }
  const f = DriveApp.createFile(FILE_NAME, '{}', 'application/json');
  props.setProperty('FILE_ID', f.getId());
  return f;
}

function out_(obj) {
  return ContentService.createTextOutput(typeof obj === 'string' ? obj : JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return out_(file_().getBlob().getDataAsString());
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const incoming = JSON.parse(e.postData.contents);
    if (!incoming || !Array.isArray(incoming.people)) return out_({ok: false, error: 'bad data'});
    const f = file_();
    let current = {};
    try { current = JSON.parse(f.getBlob().getDataAsString()); } catch (err) {}
    // someone saved a newer version meanwhile — send it back instead of overwriting
    if ((current.updatedAt || 0) > (incoming.updatedAt || 0)) return out_({ok: false, stale: true, data: current});
    f.setContent(JSON.stringify(incoming));
    return out_({ok: true, updatedAt: incoming.updatedAt});
  } finally {
    lock.releaseLock();
  }
}
