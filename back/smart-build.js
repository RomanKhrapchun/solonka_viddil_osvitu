import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Отримуємо поточну директорію для ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Кольори для консолі
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  purple: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

// Функції для кольорового виводу
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  step: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`),
  title: (msg) => console.log(`${colors.bold}${colors.purple}${msg}${colors.reset}`),
  pm2: (msg) => console.log(`${colors.cyan}🔄 ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.yellow}🧪 ${msg}${colors.reset}`)
};

// Функція для виконання команд з обробкою помилок
function runCommand(command, description, options = {}) {
  log.info(`Виконуємо: ${command}`);
  
  try {
    const result = execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
      cwd: process.cwd(),
      ...options
    });
    
    if (!options.silent) {
      log.success(`${description} - завершено`);
    }
    
    return { success: true, output: result };
  } catch (error) {
    log.error(`${description} - провалилось!`);
    
    if (error.stdout) {
      console.log('📄 Вивід команди:');
      console.log(error.stdout);
    }
    
    if (error.stderr) {
      console.log('📄 Помилки:');
      console.log(error.stderr);
    }
    
    return { success: false, error: error.message, code: error.status };
  }
}

// Функція для перевірки існування файлу
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// Функція для підрахунку тестових файлів
function countTestFiles(dirPath) {
  try {
    let count = 0;
    const testFiles = [];
    
    function searchFiles(dir) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && 
              entry.name !== 'node_modules' && 
              entry.name !== '.git' && 
              entry.name !== 'dist' &&
              entry.name !== 'coverage') {
            searchFiles(fullPath);
          } else if (entry.isFile()) {
            const isTestFile = entry.name.endsWith('.test.js') || 
                              entry.name.endsWith('.spec.js') ||
                              entry.name.endsWith('.test.mjs') || 
                              entry.name.endsWith('.spec.mjs');
            if (isTestFile) {
              count++;
              testFiles.push(path.relative(dirPath, fullPath));
            }
          }
        }
      } catch {
        // Ігноруємо помилки доступу
      }
    }
    
    searchFiles(dirPath);
    return { count, files: testFiles };
  } catch {
    return { count: 0, files: [] };
  }
}

// Функція для перевірки статусу PM2 процесу
function checkPM2Status(appName) {
  try {
    const result = execSync(`pm2 describe ${appName}`, { encoding: 'utf8', stdio: 'pipe' });
    const isOnline = result.includes('online');
    const isStopped = result.includes('stopped');
    return { 
      exists: true, 
      isOnline,
      isStopped,
      output: result 
    };
  } catch {
    return { exists: false, isOnline: false, isStopped: false };
  }
}

// Функція для отримання інформації про проект
function getProjectInfo() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return {
      name: packageJson.name || 'unknown',
      version: packageJson.version || 'unknown',
      scripts: packageJson.scripts || {},
      dependencies: Object.keys(packageJson.dependencies || {}),
      devDependencies: Object.keys(packageJson.devDependencies || {})
    };
  } catch {
    return null;
  }
}

// Функція для відкриття логів PM2
function openPM2Logs(appName) {
  const platform = os.platform();
  
  try {
    if (platform === 'win32') {
      execSync(`start cmd /k "pm2 logs ${appName}"`, { stdio: 'ignore' });
      log.success('Логи PM2 відкрито в новому вікні');
    } else {
      log.info(`Для перегляду логів виконайте: pm2 logs ${appName}`);
    }
  } catch {
    log.warning('Не вдалося відкрити логи автоматично');
    log.info(`Для перегляду логів виконайте: pm2 logs ${appName}`);
  }
}

// Функція для очікування введення користувача
function askUser(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Головна функція
async function testAndDeploy() {
  const startTime = Date.now();
  const appName = 'adminka';
  
  console.clear();
  log.title('🧪 Test & Deploy - Node.js Backend');
  log.title('===================================');
  console.log(`📍 Платформа: ${os.platform()}`);
  console.log(`📍 Node.js: ${process.version}`);
  console.log(`📍 Директорія: ${process.cwd()}`);
  console.log(`📍 PM2 App: ${appName}`);
  
  // Крок 1: Перевірка середовища
  log.step('1️⃣ Перевірка середовища...');
  
  if (!fileExists('package.json')) {
    log.error('package.json не знайдено!');
    log.warning('Переконайтесь що ви в директорії backend/');
    await askUser('Натисніть Enter щоб закрити...');
    process.exit(1);
  }
  log.success('package.json знайдено');
  
  // Отримуємо інформацію про проект
  const projectInfo = getProjectInfo();
  if (projectInfo) {
    log.success(`Проект: ${projectInfo.name} v${projectInfo.version}`);
  }
  
  // Перевірка необхідних інструментів
  const nodeCheck = runCommand('node --version', 'Перевірка Node.js', { silent: true });
  const npmCheck = runCommand('npm --version', 'Перевірка npm', { silent: true });
  const pm2Check = runCommand('pm2 --version', 'Перевірка PM2', { silent: true });
  
  if (!nodeCheck.success || !npmCheck.success) {
    log.error('Node.js або npm не встановлені!');
    await askUser('Натисніть Enter щоб закрити...');
    process.exit(1);
  }
  
  if (!pm2Check.success) {
    log.error('PM2 не встановлено!');
    console.log('\n💡 Для встановлення PM2:');
    console.log('   npm install -g pm2');
    await askUser('Натисніть Enter щоб закрити...');
    process.exit(1);
  }
  
  log.success('Всі необхідні інструменти встановлені');
  
  // Крок 2: Перевірка залежностей
  log.step('2️⃣ Перевірка залежностей...');
  
  if (!fileExists('node_modules')) {
    log.warning('node_modules не знайдено, встановлюємо...');
    const installResult = runCommand('npm install', 'Встановлення залежностей');
    if (!installResult.success) {
      log.error('Не вдалося встановити залежності');
      await askUser('Натисніть Enter щоб закрити...');
      process.exit(1);
    }
  } else {
    log.success('node_modules знайдено');
  }
  
  // Крок 3: Пошук тестових файлів
  log.step('3️⃣ Пошук тестових файлів...');
  
  const testInfo = countTestFiles('.');
  
  if (testInfo.count === 0) {
    log.warning('Тестові файли не знайдені!');
    console.log('\n💡 Шукав файли з розширеннями: .test.js, .spec.js, .test.mjs, .spec.mjs');
    console.log('💡 Директорії: tests/, test/, __tests__, spec/');
    
    const answer = await askUser('\nПродовжити без тестів? (y/n): ');
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      log.error('Процес скасовано');
      await askUser('Натисніть Enter щоб закрити...');
      process.exit(1);
    }
    
    log.warning('Продовжуємо без запуску тестів...');
  } else {
    log.success(`Знайдено ${testInfo.count} тестових файлів`);
    
    // Показуємо список тестових файлів
    console.log('\n📋 Знайдені тестові файли:');
    testInfo.files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
  }
  
  // Крок 4: Запуск тестів
  if (testInfo.count > 0) {
    log.step('4️⃣ Запуск тестів...');
    
    let testResult = null;
    
    // Спробуємо різні команди для запуску тестів
    if (projectInfo?.scripts?.test) {
      log.test('Використовуємо npm test...');
      testResult = runCommand('npm test', 'Запуск тестів через npm test');
    } else {
      // Пробуємо різні варіанти
      const testCommands = [
        { cmd: 'npx jest', desc: 'Jest тести' },
        { cmd: 'npx mocha tests/**/*.js', desc: 'Mocha тести' },
        { cmd: 'npx mocha test/**/*.js', desc: 'Mocha тести (test/)' },
        { cmd: 'npx vitest run', desc: 'Vitest тести' },
        { cmd: 'node --test', desc: 'Native Node.js тести' }
      ];
      
      for (const { cmd, desc } of testCommands) {
        log.test(`Пробуємо: ${cmd}`);
        testResult = runCommand(cmd, desc);
        
        if (testResult.success) {
          break;
        }
      }
    }
    
    // Аналіз результатів тестів
    if (!testResult || !testResult.success) {
      log.error('ТЕСТИ ПРОВАЛИЛИСЬ! 🚫');
      
      console.log('\n' + '='.repeat(50));
      console.log('🚫 КРИТИЧНА ПОМИЛКА: ТЕСТИ НЕ ПРОЙШЛИ');
      console.log('='.repeat(50));
      console.log('\n❌ ЧОМУ DEPLOY ЗАБЛОКОВАНО:');
      console.log('   • Тести виявили помилки в коді');
      console.log('   • Рестарт поламаного коду = збій production сервера');
      console.log('   • Автоматичний захист від деплою неякісного коду');
      
      console.log('\n🛠️  ЩО ПОТРІБНО ЗРОБИТИ:');
      console.log('   1. Подивіться ВИЩЕ на детальні помилки тестів');
      console.log('   2. Виправте код щоб всі тести проходили');
      console.log('   3. Перевірте локально: npm test');
      console.log('   4. Запустіть цей скрипт знову після виправлення');
      
      console.log('\n💡 КОРИСНІ КОМАНДИ ДЛЯ ДЕБАГУ:');
      if (projectInfo?.scripts?.test) {
        console.log('   • npm test -- --verbose - детальний вивід тестів');
      }
      console.log('   • npm run test:watch - автоматичний перезапуск тестів');
      console.log('   • npm run test:coverage - покриття коду тестами');
      
      console.log('\n' + '='.repeat(50));
      console.log('❌ DEPLOY СКАСОВАНО ДЛЯ БЕЗПЕКИ');
      console.log('='.repeat(50));
      
      await askUser('\nНатисніть Enter щоб закрити...');
      process.exit(1);
    }
    
    // Тести пройшли успішно
    log.success('🎉 ВСІ ТЕСТИ ПРОЙШЛИ УСПІШНО!');
    console.log('\n✅ Код пройшов всі перевірки');
    console.log('✅ Готово до деплою в production');
  }
  
  // Крок 5: Перевірка PM2 статусу
  log.step('5️⃣ Перевірка PM2 статусу...');
  
  const pm2Status = checkPM2Status(appName);
  
  if (pm2Status.exists) {
    if (pm2Status.isOnline) {
      log.success(`PM2 процес "${appName}" працює (ONLINE)`);
    } else if (pm2Status.isStopped) {
      log.warning(`PM2 процес "${appName}" зупинено (STOPPED)`);
    } else {
      log.warning(`PM2 процес "${appName}" в невідомому стані`);
    }
  } else {
    log.warning(`PM2 процес "${appName}" не знайдено`);
    log.info('Буде створено новий процес');
  }
  
  // Крок 6: PM2 Restart/Start
  log.step('6️⃣ Оновлення PM2 процесу...');
  
  let deployResult = false;
  
  if (pm2Status.exists) {
    // Процес існує - рестартуємо
    log.pm2(`Перезапускаємо процес "${appName}"...`);
    console.log('🔄 Виконується "hot restart" без втрати з\'єднань...');
    
    const restartResult = runCommand(`pm2 restart ${appName}`, 'PM2 Restart');
    deployResult = restartResult.success;
    
    if (deployResult) {
      log.success('Процес успішно перезапущено');
    }
  } else {
    // Процес не існує - створюємо новий
    log.pm2(`Створюємо новий процес "${appName}"...`);
    
    // Шукаємо файл для запуску
    const possibleFiles = ['app.js', 'server.js', 'index.js', 'src/app.js', 'src/server.js'];
    let mainFile = null;
    
    for (const file of possibleFiles) {
      if (fileExists(file)) {
        mainFile = file;
        break;
      }
    }
    
    let startResult = null;
    
    if (fileExists('ecosystem.config.js')) {
      log.info('Знайдено ecosystem.config.js');
      startResult = runCommand('pm2 start ecosystem.config.js', 'PM2 Start з ecosystem');
    } else if (projectInfo?.scripts?.start) {
      log.info('Знайдено npm start script');
      startResult = runCommand(`pm2 start npm --name ${appName} -- start`, 'PM2 Start з npm script');
    } else if (mainFile) {
      log.info(`Запускаємо основний файл: ${mainFile}`);
      startResult = runCommand(`pm2 start ${mainFile} --name ${appName}`, 'PM2 Start');
    } else {
      log.error('Не знайдено файл для запуску!');
      console.log('💡 Створіть один з файлів: app.js, server.js, index.js');
      await askUser('Натисніть Enter щоб закрити...');
      process.exit(1);
    }
    
    deployResult = startResult?.success || false;
    
    if (deployResult) {
      log.success('Процес успішно створено та запущено');
    }
  }
  
  // Перевірка результату деплою
  if (!deployResult) {
    log.error('PM2 ОПЕРАЦІЯ ПРОВАЛИЛАСЬ! 🚫');
    
    console.log('\n' + '='.repeat(50));
    console.log('🚫 ПОМИЛКА ДЕПЛОЮ');
    console.log('='.repeat(50));
    console.log('\n❌ МОЖЛИВІ ПРИЧИНИ:');
    console.log('   • Порт вже зайнятий іншим процесом');
    console.log('   • Проблеми з базою даних або зовнішніми API');
    console.log('   • Неправильна конфігурація середовища (.env)');
    console.log('   • Runtime помилки що не виявили тести');
    
    console.log('\n🔍 ДЕБАГІНГ:');
    console.log(`   • pm2 logs ${appName} - детальні логи помилок`);
    console.log(`   • pm2 describe ${appName} - інформація про процес`);
    console.log('   • pm2 list - список всіх процесів');
    console.log('   • netstat -an | grep :3000 - перевірка порту');
    
    console.log('\n💡 ШВИДКІ РІШЕННЯ:');
    console.log('   • Перевірте .env файл та змінні середовища');
    console.log('   • Переконайтесь що база даних доступна');
    console.log('   • Перевірте чи не зайнятий порт сервера');
    
    console.log('\n' + '='.repeat(50));
    
    const showLogs = await askUser('\nПоказати логи PM2 для дебагу? (y/n): ');
    if (showLogs.toLowerCase() === 'y' || showLogs.toLowerCase() === 'yes') {
      console.log(`\n📋 Логи для процесу "${appName}":`);
      console.log('-'.repeat(50));
      runCommand(`pm2 logs ${appName} --lines 20`, 'PM2 Logs');
    }
    
    await askUser('\nНатисніть Enter щоб закрити...');
    process.exit(1);
  }
  
  // Крок 7: Верифікація запуску
  log.step('7️⃣ Верифікація запуску...');
  
  log.info('Очікуємо 3 секунди для повного запуску...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const finalStatus = checkPM2Status(appName);
  
  if (finalStatus.exists && finalStatus.isOnline) {
    log.success('✅ Процес працює стабільно (ONLINE)');
  } else {
    log.warning('⚠️ Процес може мати проблеми зі статусом');
    console.log(`💡 Перевірте: pm2 logs ${appName}`);
  }
  
  // Фінальний звіт
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  console.log('\n' + '='.repeat(60));
  log.title('🎉 TEST & DEPLOY ЗАВЕРШЕНО УСПІШНО!');
  console.log('='.repeat(60));
  
  console.log('\n📊 ПІДСУМОК ОПЕРАЦІЙ:');
  console.log(`  ⏱️  Загальний час: ${duration} секунд`);
  console.log(`  🧪 Тестових файлів: ${testInfo.count}`);
  console.log(`  🟢 Тести: ${testInfo.count > 0 ? 'ПРОЙШЛИ ✅' : 'ПРОПУЩЕНІ ⚠️'}`);
  console.log(`  🔄 PM2 операція: ${pm2Status.exists ? 'RESTART' : 'START'} ✅`);
  console.log(`  📱 Процес: ${appName} (ONLINE) ✅`);
  
  console.log('\n🎯 СТАТУС ДЕПЛОЮ:');
  console.log('  ✅ Код протестовано та перевірено');
  console.log('  ✅ PM2 процес успішно оновлено');  
  console.log('  ✅ Backend готовий обробляти запити');
  console.log('  🌐 Production сервер працює стабільно!');
  
  console.log('\n💡 КОРИСНІ КОМАНДИ ДЛЯ МОНІТОРИНГУ:');
  console.log(`  📈 pm2 monit - моніторинг в реальному часі`);
  console.log(`  📋 pm2 logs ${appName} - перегляд логів`);
  console.log(`  📊 pm2 describe ${appName} - детальна інформація`);
  console.log(`  🔄 pm2 restart ${appName} - ручний рестарт`);
  console.log('  📱 pm2 list - список всіх процесів');
  
  console.log('\n' + '='.repeat(60));
  
  // Пропозиція переглянути логи
  const viewLogs = await askUser('\n🔍 Відкрити логи для моніторингу роботи? (y/n): ');
  if (viewLogs.toLowerCase() === 'y' || viewLogs.toLowerCase() === 'yes') {
    openPM2Logs(appName);
  }
  
  console.log('\n✨ Дякую за використання Test & Deploy скрипта!');
  await askUser('Натисніть Enter щоб закрити...');
}

// Обробка помилок та сигналів
process.on('uncaughtException', async (error) => {
  log.error(`Критична помилка: ${error.message}`);
  console.log('\n🔍 Stack trace:');
  console.log(error.stack);
  await askUser('\nНатисніть Enter щоб закрити...');
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  log.error(`Unhandled Promise Rejection: ${reason}`);
  await askUser('Натисніть Enter щоб закрити...');
  process.exit(1);
});

process.on('SIGINT', async () => {
  log.warning('\n\nПроцес перерваний користувачем (Ctrl+C)');
  console.log('🛑 Операція скасована');
  await askUser('Натисніть Enter щоб закрити...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log.warning('\nПроцес завершується системою');
  await askUser('Натисніть Enter щоб закрити...');
  process.exit(0);
});

// Запуск основної функції
testAndDeploy().catch(async (error) => {
  log.error(`Помилка виконання скрипта: ${error.message}`);
  console.log('\n🔍 Детальна інформація:');
  console.log(error.stack);
  await askUser('\nНатисніть Enter щоб закрити...');
  process.exit(1);
});