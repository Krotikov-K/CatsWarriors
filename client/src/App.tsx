function App() {
  console.log('App starting...');
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-4">Cats War - Война Котов</h1>
      <div className="space-y-4">
        <p>Игра загружается...</p>
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl mb-2">Статус системы:</h2>
          <p>✅ Сервер запущен</p>
          <p>✅ React загружен</p>
          <p>🔄 Система повышения уровня готова</p>
        </div>
        <button 
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          onClick={() => alert('Система работает!')}
        >
          Тест интерактивности
        </button>
      </div>
    </div>
  );
}

export default App;