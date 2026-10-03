import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

pdfjsLib.GlobalWorkerOptions.workerSrc='pdf.worker.min.js';
window.ShacirkaPDF=pdfjsLib;
