import sharp from 'sharp';

console.log('Sharp version:', sharp.versions.sharp);
console.log('libvips version:', sharp.versions.vips);
console.log('Formats:', sharp.format);
console.log('HEIF output support:', sharp.format.heif.output); // This is for outputting HEIC, we need input
console.log('HEIF input support:', sharp.format.heif.input);
