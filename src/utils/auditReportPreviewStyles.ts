export const REPORT_PREVIEW_STYLES = `
.report-preview [contenteditable] {
  font-family: "Times New Roman", Times, serif;
  font-size: 12pt;
  line-height: 1.15;
  color: #1b1c21;
  height: 65vh;
  overflow: auto;
  background: #fff;
  padding: 72px 88px;
  white-space: normal;
  overflow-wrap: break-word;
  box-sizing: border-box;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
}

.report-preview .preview-doc {
  width: 100%;
  font-size: 12pt;
  line-height: 1.15;
}

.report-preview .preview-doc,
.report-preview .preview-doc * {
  font-family: "Times New Roman", Times, serif;
  font-size: 12pt;
  line-height: 1.15;
}

.report-preview .preview-doc p {
  margin: 0 0 6pt 0;
  text-align: justify;
}

.report-preview .preview-doc .title {
  font-size: 12pt;
  font-weight: 700;
  text-align: center;
  margin-bottom: 8pt;
}

.report-preview .preview-doc .subtitle {
  text-align: center;
  margin-bottom: 8pt;
}

.report-preview .preview-doc .heading {
  font-weight: 600;
  margin-top: 8pt;
}

.report-preview .preview-doc .subheading {
  font-weight: 600;
  margin-top: 6pt;
}

.report-preview .preview-doc .signature {
  margin-top: 14pt;
  text-align: right;
}

.report-preview .preview-doc .signature p {
  text-align: right;
  margin: 0;
}

.report-preview .preview-doc .highlight {
  background: #fff3a3;
  padding: 0 4px;
}

.report-preview .preview-doc .bullet {
  margin-left: 0;
  padding-left: 1.5em;
  text-indent: -0.75em;
}

.report-preview .preview-doc .spacer {
  min-height: 12pt;
}

.report-preview .preview-doc ul {
  margin: 0 0 6pt 1.2em;
  padding: 0;
}

.report-preview .preview-doc li {
  margin: 0 0 4pt 0;
}

.report-preview .page-break {
  page-break-after: always;
}

.preview-doc {
  font-family: "Times New Roman", Times, serif;
  font-size: 12pt;
  line-height: 1.15;
  color: #1b1c21;
}

.preview-doc p {
  margin: 0 0 6pt 0;
  text-align: justify;
}

.preview-doc .title {
  font-size: 12pt;
  font-weight: 700;
  text-align: center;
  margin-bottom: 8pt;
}

.preview-doc .subtitle {
  text-align: center;
  margin-bottom: 8pt;
}

.preview-doc .heading {
  font-weight: 600;
  margin-top: 8pt;
}

.preview-doc .subheading {
  font-weight: 600;
  margin-top: 6pt;
}

.preview-doc .signature {
  margin-top: 14pt;
  text-align: right;
}

.preview-doc .signature p {
  text-align: right;
  margin: 0;
}

.preview-doc .highlight {
  background: #fff3a3;
  padding: 0 4px;
}

.preview-doc .bullet {
  margin-left: 0;
  padding-left: 1.5em;
  text-indent: -0.75em;
}

.preview-doc .spacer {
  min-height: 12pt;
}

.preview-doc ul {
  margin: 0 0 6pt 1.2em;
  padding: 0;
}

.preview-doc li {
  margin: 0 0 4pt 0;
}

.preview-doc .page-break {
  page-break-after: always;
}
`;
