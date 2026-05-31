import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

// Entry point — boot the game. Everything else lives in scenes/systems.
const game = new Phaser.Game(gameConfig);

// Expose the running game for debugging from the browser console (and automated checks).
// Harmless — no data leaves the page; the game holds no secrets.
(window as unknown as { game: Phaser.Game }).game = game;
