import { GameEngine } from './server/services/gameEngine.js';

console.log('Testing level system...');

// Создаем тестовую функцию
async function testLevelUp() {
  try {
    console.log('Testing GameEngine.checkAndProcessLevelUp function...');
    
    // Должно работать для персонажа с ID 17
    const result = await GameEngine.checkAndProcessLevelUp(17);
    console.log('Level up result:', result);
    
  } catch (error) {
    console.error('Error testing level up:', error);
  }
}

testLevelUp();