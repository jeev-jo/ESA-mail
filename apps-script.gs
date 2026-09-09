/**
 * Apps Script Web App that logs ESA objection-email form submissions
 * to the Sheet it is bound to. See README-google-sheet.md for setup steps.
 */
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Timestamp", "Name", "Mobile", "Address", "Date", "Place", "Template"]);
  }

  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    new Date(),
    data.name || "",
    data.mobile || "",
    data.address || "",
    data.date || "",
    data.place || "",
    data.template || ""
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}
