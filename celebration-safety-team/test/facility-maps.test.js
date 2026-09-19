/* Facility Maps — the Full Site Schematic slot (renderSchematicSlot) and the
   4 admin-upload slots (renderMapSlot). A PDF upload can't use the image
   lightbox (openLightbox only zooms an <img>), so it gets its own "View Full
   Screen" escape hatch instead; an image upload keeps the click-to-zoom
   lightbox that already exists for every other uploaded map. */
const { loadApp, runner } = require('./harness');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

function els() {
  const cache = {};
  return id => (cache[id] = cache[id] || { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelector: () => null, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){} });
}

group('renderSchematicSlot(): no upload yet shows the default caption and an upload control');
const e1 = els();
ctx.document.getElementById = e1;
T.S = { facilityMaps: {} };
T.adminOn = true;
ctx.renderSchematicSlot();
check('default caption stays visible', e1('schematicDefaultCaption').style.display === '', e1('schematicDefaultCaption').style);
check('the slot itself is untouched (no innerHTML overwrite)', e1('mapSlot-site-schematic').innerHTML === '');
check('an upload control is offered', e1('schematicUploadCtl').innerHTML.includes('Upload'), e1('schematicUploadCtl').innerHTML);

group('renderSchematicSlot(): a PDF upload gets a taller iframe and a View Full Screen button, not the image lightbox');
const e2 = els();
ctx.document.getElementById = e2;
T.S = { facilityMaps: { 'site-schematic': { storagePath: 'site-schematic/evac-map.pdf', uploadedAt: '2026-09-18T12:00:00Z', url: 'https://example.com/signed/evac-map.pdf', isPdf: true } } };
ctx.renderSchematicSlot();
const pdfHtml = e2('mapSlot-site-schematic').innerHTML;
check('default caption is hidden once a real upload exists', e2('schematicDefaultCaption').style.display === 'none', e2('schematicDefaultCaption').style);
check('an iframe is rendered', pdfHtml.includes('<iframe'), pdfHtml);
check('the frame is at least 70vh tall, not the old fixed 520px', pdfHtml.includes('height:70vh'), pdfHtml);
check('a View Full Screen button is present', pdfHtml.includes('View Full Screen'), pdfHtml);
check('it opens the signed URL in a new tab', pdfHtml.includes("window.open('https://example.com/signed/evac-map.pdf','_blank')"), pdfHtml);
check('no openLightbox call for a PDF (it only knows how to zoom an image)', !pdfHtml.includes('openLightbox'), pdfHtml);
check('replace control is offered once something is uploaded', e2('schematicUploadCtl').innerHTML.includes('Replace'), e2('schematicUploadCtl').innerHTML);

group('renderSchematicSlot(): an image upload keeps the existing click-to-zoom lightbox');
const e3 = els();
ctx.document.getElementById = e3;
T.S = { facilityMaps: { 'site-schematic': { storagePath: 'site-schematic/evac-map.png', uploadedAt: '2026-09-18T12:00:00Z', url: 'https://example.com/signed/evac-map.png', isPdf: false } } };
ctx.renderSchematicSlot();
const imgHtml = e3('mapSlot-site-schematic').innerHTML;
check('an <img> is rendered, not an iframe', imgHtml.includes('<img') && !imgHtml.includes('<iframe'), imgHtml);
check('clicking it opens the lightbox', imgHtml.includes("onclick=\"openLightbox('https://example.com/signed/evac-map.png','Full Site Schematic')\""), imgHtml);
check('no View Full Screen button for an image (the lightbox already covers it)', !imgHtml.includes('View Full Screen'), imgHtml);

group('renderMapSlot(): the click-to-zoom lightbox also works for the 4 ordinary upload slots (foyer, sanctuary, etc.)');
const e4 = els();
ctx.document.getElementById = e4;
T.S = { facilityMaps: { foyer: { storagePath: 'foyer/diagram.jpg', uploadedAt: '2026-09-18T12:00:00Z', url: 'https://example.com/signed/foyer.jpg', isPdf: false } } };
ctx.renderMapSlot('foyer');
const foyerHtml = e4('mapSlot-foyer').innerHTML;
check('an <img> is rendered for the foyer slot', foyerHtml.includes('<img'), foyerHtml);
check('clicking it opens the lightbox with the foyer label', foyerHtml.includes('openLightbox') && foyerHtml.includes('foyer'), foyerHtml);

done();
