// Debugging level check system
const fetch = require('node-fetch');

async function testLevelCheck() {
  console.log('=== DEBUGGING LEVEL CHECK SYSTEM ===');
  
  // Test with character 17 (Кисяо)
  const response = await fetch('http://localhost:5000/api/game-state?userId=1');
  const data = await response.json();
  
  console.log('Character data:');
  console.log(`- Name: ${data.character.name}`);
  console.log(`- Level: ${data.character.level}`);
  console.log(`- Experience: ${data.character.experience}`);
  console.log(`- Unspent stat points: ${data.character.unspentStatPoints}`);
  
  // Calculate expected level
  const expectedLevel = Math.floor(data.character.experience / 1000) + 1;
  console.log(`- Expected level: ${expectedLevel}`);
  console.log(`- Level is correct: ${data.character.level === expectedLevel}`);
}

testLevelCheck().catch(console.error);