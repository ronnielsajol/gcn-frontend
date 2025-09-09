export function getRandomGradientStyle() {
	// Generate two random, light HSL colors
	const hue1 = Math.floor(Math.random() * 360);
	const hue2 = (hue1 + Math.floor(Math.random() * 120) + 120) % 360; // Ensure colors are distinct

	const color1 = `hsl(${hue1}, 90%, 85%)`; // Light and saturated
	const color2 = `hsl(${hue2}, 90%, 85%)`;

	// Generate a random angle
	const angle = Math.floor(Math.random() * 360);

	return {
		backgroundImage: `linear-gradient(${angle}deg, ${color1}, ${color2})`,
	};
}
