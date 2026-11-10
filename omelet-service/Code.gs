/**
 * SNB Mess Google Sheet backend for github.io/omelet-service/.
 * Bind to your Sheet via Extensions > Apps Script. Run setup() once.
 * Keep the generated SYNC_KEY out of GitHub and public messages.
 * Deploy web app: Execute as Me; Access Anyone (required for cross-origin admin UI).
 * This is a single-admin shared-secret design, NOT member authentication.
 */
const TAB='Orders', SUMMARY='Monthly Summary', SETTINGS='Settings';
const HEAD=['Order ID','Order Date','Month','Meal','Mess Serial Number','Omelet Count','Status','Updated At'];
const SUMHEAD=['Month','Mess Serial Number','Lunch Omelets','Dinner Omelets','Total Omelets','Price per Omelet (INR)','Bill (INR)'];
function setup(){
  ensure_();
  const props=PropertiesService.getScriptProperties();
  if(!props.getProperty('SYNC_KEY')) props.setProperty('SYNC_KEY',Utilities.getUuid()+Utilities.getUuid());
  rebuild_();
  Logger.log('PRIVATE SYNC KEY (keep secret): '+props.getProperty('SYNC_KEY'));
  return 'Setup complete. Check Execution log for your private sync key.';
}
function ensure_(){
 const ss=SpreadsheetApp.getActiveSpreadsheet(); if(!ss)throw Error('Create this script from Google Sheets > Extensions > Apps Script.');
 let orders=ss.getSheetByName(TAB);if(!orders)orders=ss.insertSheet(TAB);
 if(orders.getLastRow()===0){orders.getRange(1,1,1,8).setValues([HEAD]);orders.setFrozenRows(1);orders.getRange('A:E').setNumberFormat('@');orders.getRange('G:H').setNumberFormat('@');style_(orders,8)}
 let summary=ss.getSheetByName(SUMMARY);if(!summary)summary=ss.insertSheet(SUMMARY);
 if(summary.getLastRow()===0){summary.getRange(1,1,1,7).setValues([SUMHEAD]);summary.setFrozenRows(1);summary.getRange('A:B').setNumberFormat('@');summary.getRange('F:G').setNumberFormat('₹#,##0.00');style_(summary,7)}
 let settings=ss.getSheetByName(SETTINGS);if(!settings)settings=ss.insertSheet(SETTINGS);
 if(settings.getLastRow()===0){settings.getRange('A1:B2').setValues([['Setting','Value'],['Default price per omelet (INR)','']]);settings.getRange('A5:B5').setValues([['Month (YYYY-MM)','Price per omelet (INR)']]);settings.getRange('A6:A').setNumberFormat('@');settings.getRange('B2').setNumberFormat('₹#,##0.00');settings.getRange('B6:B').setNumberFormat('₹#,##0.00');settings.setFrozenRows(1);settings.setColumnWidth(1,330);style_(settings,2)}
 return{ss,orders,summary,settings};
}
function style_(s,n){s.getRange(1,1,1,n).setBackground('#196247').setFontColor('#fff').setFontWeight('bold')}
function auth_(key){
 const expected=PropertiesService.getScriptProperties().getProperty('SYNC_KEY');
 if(!expected || String(key)!==expected)throw Error('Invalid sync key. Run setup() and copy the key from the execution log.');
}
function validate_(o){
 if(!o||typeof o!=='object')throw Error('Invalid record');
 const s=x=>String(x||'').trim();
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(s(o.id)))throw Error('Invalid order ID');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s(o.date)))throw Error('Invalid date');
 const d=new Date(s(o.date)+'T00:00:00Z');
 if(isNaN(d.getTime())||d.toISOString().slice(0,10)!==o.date)throw Error('Invalid calendar date');
 if(!['Lunch','Dinner'].includes(o.meal))throw Error('Invalid meal');
 if(!/^[A-Za-z0-9][A-Za-z0-9._\/-]{0,29}$/.test(s(o.serial)))throw Error('Invalid serial');
 if(!Number.isInteger(Number(o.count))||Number(o.count)<1||Number(o.count)>1000)throw Error('Invalid count');
 if(!['Active','Cancelled'].includes(o.status))throw Error('Invalid status');
 if(typeof o.updated!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(o.updated)||!Number.isFinite(Date.parse(o.updated)))throw Error('Invalid update time');
 return{id:s(o.id),date:s(o.date),meal:o.meal,serial:s(o.serial),count:Number(o.count),status:o.status,updated:o.updated};
}
function read_(){
 const s=ensure_().orders,last=s.getLastRow();if(last<2)return[];
 return s.getRange(2,1,last-1,8).getValues().filter(r=>r[0]).map(r=>({id:String(r[0]),date:String(r[1]),meal:String(r[3]),serial:String(r[4]),count:Number(r[5]),status:String(r[6]),updated:String(r[7])}));
}
function sortSerial_(a,b){return String(a).localeCompare(String(b),undefined,{numeric:true,sensitivity:'base'})}
/**
 * Monthly Summary is now formula-driven directly in the Google Sheet.
 * Do not rewrite its cells: doing so destroys the spill formulas in A2 and E2:G2.
 * Changes to the Orders or Settings tabs automatically recalculate in Sheets.
 */
function rebuild_(){
 SpreadsheetApp.flush();
 return 'The Monthly Summary is calculated by spreadsheet formulas.';
}
function onEdit(e){ /* Spreadsheet formulas recalculate automatically. */ }
function doGet(e){
 let cb=String(e&&e.parameter&&e.parameter.callback||'');
 if(!/^[A-Za-z_$][\w$]{0,110}$/.test(cb))return ContentService.createTextOutput('Invalid callback').setMimeType(ContentService.MimeType.TEXT);
 let result;try{auth_(e.parameter.key);if(e.parameter.action!=='list')throw Error('Unknown action');result={ok:true,orders:read_()}}
 catch(err){result={ok:false,error:String(err.message||err)}}
 return ContentService.createTextOutput(cb+'('+JSON.stringify(result)+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}
function doPost(e){
 let result;const lock=LockService.getScriptLock();
 try{
  if(!e||!e.parameter||!e.parameter.payload)throw Error('Missing payload');
  const payload=JSON.parse(e.parameter.payload);auth_(payload.key);
  if(!Array.isArray(payload.orders)||payload.orders.length>500)throw Error('Invalid batch size');
  const batch=payload.orders.map(validate_);
  lock.waitLock(30000);
  try{
   const sheet=ensure_().orders,existing=read_(),index=new Map(existing.map((o,i)=>[o.id,i+2]));
   let changed=0;
   for(const o of batch){
    const row=[o.id,o.date,o.date.slice(0,7),o.meal,o.serial,o.count,o.status,o.updated];
    const rowNum=index.get(o.id);
    if(rowNum){
      const old=existing[rowNum-2];
      if(Date.parse(o.updated)<Date.parse(old.updated))continue;
      sheet.getRange(rowNum,1,1,8).setValues([row]);
    } else {
      sheet.appendRow(row);index.set(o.id,sheet.getLastRow());existing.push(o);
    }
    changed++;
   }
   if(changed)rebuild_();
   result={ok:true,changed};
  }finally{lock.releaseLock()}
 }catch(err){result={ok:false,error:String(err.message||err)}}
 return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
function refreshMonthlySummary(){return rebuild_()}
