/** Marginalia request log. Public receiver can append to one private sheet, never read it. */
const REQUEST_SHEET_ID = '1PY8nP-L0-NNngX4cveEofKSk3fuOSAuXFLbaTblin_w';
const REQUEST_TAB = 'Requests';
const HEADERS = ['Submitted','Name','Email','Request type','Message','Status','Your notes','Request ID'];
const TYPES = ['Feature request','Bug report','Setup question','Something else'];

function initializeRequestLog() {
  const book = SpreadsheetApp.openById(REQUEST_SHEET_ID);
  book.setSpreadsheetTimeZone('America/New_York');
  let sheet = book.getSheetByName(REQUEST_TAB);
  if (!sheet) {
    const first = book.getSheets()[0];
    if (first.getName() === 'Sheet1' && first.getLastRow() <= 1) sheet = first.setName(REQUEST_TAB);
    else sheet = book.insertSheet(REQUEST_TAB);
  }
  sheet.getRange(1,1,1,HEADERS.length).setValues([HEADERS]).setBackground('#132237').setFontColor('#f6f3eb').setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1,34);
  [165,145,245,170,520,145,350,310].forEach((width,index) => sheet.setColumnWidth(index+1,width));
  sheet.getRange(2,1,Math.max(1,sheet.getMaxRows()-1),8).setVerticalAlignment('top');
  sheet.getRange(2,5,Math.max(1,sheet.getMaxRows()-1),1).setWrap(true);
  sheet.getRange(2,7,Math.max(1,sheet.getMaxRows()-1),1).setWrap(true);
  sheet.getRange(2,1,Math.max(1,sheet.getMaxRows()-1),1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(['New','Reviewing','Planned','Done','Declined'],true).setAllowInvalid(false).build();
  sheet.getRange(2,6,Math.max(1,sheet.getMaxRows()-1),1).setDataValidation(rule);
  if (!sheet.getFilter()) sheet.getRange(1,1,sheet.getMaxRows(),8).createFilter();
  return 'Request log ready';
}

function requestData_(event) {
  const raw = event && event.postData && event.postData.contents;
  if (typeof raw !== 'string' || raw.length > 20000) throw new Error('Invalid request body');
  let packet;
  if (/^application\/x-www-form-urlencoded\b/i.test(event.postData.type || '')) {
    packet = {};
    raw.split('&').forEach(function (pair) {
      const at = pair.indexOf('=');
      const key = decodeURIComponent((at < 0 ? pair : pair.slice(0,at)).replace(/\+/g,' '));
      const value = decodeURIComponent((at < 0 ? '' : pair.slice(at+1)).replace(/\+/g,' '));
      if (Object.prototype.hasOwnProperty.call(packet,key)) throw new Error('Invalid duplicate field');
      packet[key] = value;
    });
    if (!packet.form_data) {
      const nested = {};
      ['name','email','type','message','request_id','consent','_honey'].forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(packet,'form_data['+key+']')) nested[key] = packet['form_data['+key+']'];
      });
      if (Object.keys(nested).length) packet = {form_data:nested};
    }
  } else {
    try { packet = JSON.parse(raw); }
    catch (_) { throw new Error('Invalid JSON encoding'); }
  }
  let data = packet && packet.form_data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); }
    catch (_) { throw new Error('Invalid nested JSON encoding'); }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid form payload');
  if (data._honey) return null;
  function text(key,max,required) {
    const value = data[key];
    if (value === undefined && !required) return '';
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('Invalid '+key);
    return value.trim();
  }
  const result = {name:text('name',100,false),email:text('email',254,true),type:text('type',50,true),message:text('message',10000,true),id:text('request_id',100,true)};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email) || !TYPES.includes(result.type) || result.message.length < 10 || !/^[A-Za-z0-9_-]{8,100}$/.test(result.id) || !data.consent) throw new Error('Invalid form fields');
  return result;
}

function sheetText_(value) {
  // Visitor text is data, including when it begins with a spreadsheet formula marker.
  return /^[\s]*[=+\-@]/.test(value) ? "'"+value : value;
}
function reply_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() {
  return reply_({service:'Marginalia request receiver',status:'ready'});
}
function doPost(event) {
  let data;
  try { data = requestData_(event); }
  catch (error) {
    // Only fixed validation labels/content type; never visitor text or email.
    console.warn('Request rejected', String(error.message).startsWith('Invalid ') ? error.message : 'Invalid encoding', String(event && event.postData && event.postData.type || '').slice(0,80));
    return reply_({success:false,error:'Invalid request'});
  }
  if (!data) return reply_({success:true,ignored:true});
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const sheet = SpreadsheetApp.openById(REQUEST_SHEET_ID).getSheetByName(REQUEST_TAB);
    if (!sheet) return reply_({success:false,error:'Log not initialized'});
    if (sheet.getLastRow() > 1 && sheet.getRange(2,8,sheet.getLastRow()-1,1).createTextFinder(data.id).matchEntireCell(true).useRegularExpression(false).findNext()) return reply_({success:true,duplicate:true});
    sheet.appendRow([new Date(),sheetText_(data.name),sheetText_(data.email),data.type,sheetText_(data.message),'New','',data.id]);
    const row = sheet.getLastRow();
    sheet.getRange(row,1,1,8).setVerticalAlignment('top');
    sheet.getRange(row,1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    sheet.getRange(row,5).setWrap(true);
    SpreadsheetApp.flush();
    return reply_({success:true});
  } catch (_) {
    // Do not log visitor messages or email addresses in execution logs.
    return reply_({success:false,error:'Unable to record request'});
  } finally { if (lock.hasLock()) lock.releaseLock(); }
}
