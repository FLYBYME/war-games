import sharp from 'sharp';
import fs from 'fs';

async function resize() {
    const input = 'src/ui/public/terrain.png';
    const output = 'src/ui/public/terrain-lowres.png';

    if (!fs.existsSync(input)) {
        console.error('Input file not found');
        return;
    }

    console.log('Resizing terrain image to 4096px...');
    await sharp(input)
        .resize(4096) // Resize to 4096 width, maintain aspect ratio
        .toFile(output);
    
    console.log(`Resized image saved to ${output}`);
}

resize();
