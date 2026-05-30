import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

// Entry point — boot the game. Everything else lives in scenes/systems.
new Phaser.Game(gameConfig);
