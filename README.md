# Squid-Game-HCI-Semester-5-Project

This is a vanilla JavaScript “Squid Game” inspired browser game that recreates the Red Light, Green Light challenge with clean structure and smooth gameplay.

The game is built around three main states: idle, playing, and game over. The player moves forward using space, click, or touch, and must stop immediately when the signal changes to red. A randomized timing system controls when the light switches between green and red, adding unpredictability and tension.

It includes three difficulty levels (Easy, Normal, Hard), which adjust total time, movement speed, light duration, and reaction (grace) time. Higher difficulty makes the game faster and more strict.

The project also features 20 AI-controlled NPCs with varying speeds and behaviors, some of which may fail during red light phases, adding realism and competition.

All sound effects are generated using the Web Audio API instead of audio files, including movement sounds, alerts, and the iconic doll tune. Visual feedback is handled through DOM manipulation and CSS effects such as screen flashes, timers, and character state changes.

Overall, it’s a fully interactive, performance-based browser game built using JavaScript, CSS, and DOM logic without any external game engines.

