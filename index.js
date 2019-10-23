const Discord = require('discord.js'); // Подключаем discord.js, что бы установить библиотеку: npm install discord.js --save
const fs = require('fs'); // Файловая система
const md5 = require('md5'); // Шифрование
const mysql = require('mysql'); // MYSQL - база данных
const bot = new Discord.Client(); // bot - это сам бот, bot.user.id - получить айди бота
let settings = process.env;
if (fs.existsSync('./settings.json')) settings = require('./settings.json'); // << Для локалки


let auth_users = [];
let _passwords;
let developers = [
    '474207250823774208', // Marco_Florencia
    '336207279412215809', // Kory_McGregor
    '408740341135704065', // Maikl_Zhosan
    '600412198904266928'
];
let levels = [
    "Пользователь", // 0
    `<@&528637205963472906>`, // Spectator | 1
    `<@&528637204055064587>`, // Support Team | 2
    `<@&588717032011333663>`, // Discord Guard | 3
    `<@&528637193946791968>`, // Discord Master | 4
    `<@&629313824956219393>`, // Developer | 5
]
const server = mysql.createConnection({
    host: settings.mysql_host,
    user: settings.mysql_user,
    password: settings.mysql_password,
    database: settings.mysql_database,
});

server.connect(function (err) {
    if (err) return console.log('[MYSQL] Произошла ошибка MYSQL, информация об ошибке: ' + err);
    console.log('[MYSQL] Вы успешно подключились к базе данных.');
    server.query("SET SESSION wait_timeout = 604800"); // Подключение активно 3 дня, далее сбрасывается.
    setInterval(() => {
        load_passwords();
    }, 1200000);
});
function load_passwords() { server.query(`SELECT * FROM \`passwords\``, (error, accounts) => { console.log(`[MYSQL] Пароли загружены.`); _passwords = accounts; }); };

bot.login(settings.token); // Авторизация бота

bot.on('ready', () => {
    load_passwords();
    console.log("[Discord] ModHelper успешно запущен.");
    bot.user.setActivity("protection Discord")
});


bot.on('message', (message) => {
    // Тут, то что будет при получении сообщения. Сообщение будет хранится в message.
    if (message.channel.type == 'dm') return; // Если сообщение отправлено в ЛС, то выход.
    if (message.content == '!ping') message.reply(`**${bot.guilds.get("600410517970092052").emojis.find(e => e.name == "modhelper_mark")}**`) && message.delete(); // Команда ping
    const command = message.content.split(/ +/)[0];
    if (message.guild.id != "600410517970092052" && message.guild.id != "528635749206196232" && message.guild.id != "561533338188251136") return

    if (message.content.startsWith(`!run`)) {
        if (!developers.some(dev => dev == message.author.id)) {
            message.reply('**недостаточно прав!**').then(msg => msg.delete(5000));
            return message.delete();
        }
        const args = message.content.slice(`!run`).split(/ +/);
        let cmdrun = args.slice(1).join(" ");
        if (cmdrun.includes('token') && !developers.some(developers => developers == message.author.id)) {
            message.member.guild.channels.find(c => c.name == "spectator-chat").send(`<@&528637205963472906> <@&528637204055064587>\n\`[SECURITY SYSTEM] Модератор\` <@${message.member.id}> \`подозревается в попытке слива дискорда. Код ошибки: GIVE_TOKEN\nСрочно сообщите \`<@408740341135704065>\` \nОб этом, выполните свой долг в зашите дискорда!\``);
            message.member.guild.channels.find(c => c.name == "general").send(`\`[SECURITY SYSTEM]\` <@${message.member.id}> \`Вы не можете сделать это!. Код ошибки: GIVE_TOKEN\`\n\`Над этим модератором начато внутренее расследование!\``);
            return message.delete();
        }
        try {
            eval(cmdrun);
        } catch (err) {
            message.reply(`**\`произошла ошибка: ${err.name} - ${err.message}\`**`);
        }
    }

    // DEVELOP`ерские команды.
    if (command == '!createacc') {
        if (!developers.some(dev => dev == message.author.id)) {
            message.reply('**у вас нет доступа к этой командне!**');
            return message.delete();
        }
        let user = message.guild.member(message.mentions.users.first());
        const args = message.content.split(/ +/);
        if (!user || !args[2] || !args[3]) {
            message.reply('**используйте: !createacc [user] [level] [password]**');
            return message.delete();
        }
        let profile = _passwords.find(acc => acc.userid == user.id); // << ХУЙНЯ КОТОРАЯ ЗАЕБАЛА
        if (profile) {
            message.reply('**аккаунт успешно создан в базе данных!**');
            return message.delete();
        }
        server.query(`INSERT INTO \`passwords\` (\`userid\`, \`level\`, \`password\`) VALUES ('${user.id}', '${args[2]}', '${md5(args.slice(3).join(' '))}')`);
        message.reply('**account created in the database!**');
        message.delete();
        // Отправка пользователю информацию о том, что ему удалили добавили аккаунт в бд
        const embed = new Discord.RichEmbed().setColor('#ffffff').setTitle(`** ${bot.guilds.get("600410517970092052").emojis.find(e => e.name == "modhelper_mark")} Добавление аккаунта.**`).setDescription(`**<@${user.id}>, ваш аккаунт создан в базе данных бота!**`).setTimestamp().setFooter("ModHelper Info");
        user.send(embed).catch(err => {
            message.guild.channels.find(c => c.name == "general").send(embed);
        });
        return load_passwords();


    }
    if (command == "!dellacc") {
        // Проверяем права
        if (!developers.some(dev => dev == message.author.id)) {
            message.reply('**недостаточно прав!**');
            return message.delete();
        }
        // Проверяем наличие всех параметров
        const args = message.content.slice(`!dellacc`).split(/ +/);
        let user = message.guild.member(message.mentions.users.first());
        let reason = args.slice(1).join(" ");
        if (!user) {
            message.reply('**используйте: !dellacc [user]**');
            return message.delete();
        }
        // Проверяем наличие акка в бд
        server.query(`SELECT * FROM \`passwords\` WHERE \`userid\` = '${user.id}'`, async (error, result, packets) => {
            if (error) return console.error(error);
            if (result.length <= 0) {
                message.reply(`**аккаунт не найден в базе данных.**`)
                return message.delete();
            } else {
                // Удаление пользователя из БД
                server.query(`DELETE FROM \`passwords\` WHERE \`userid\` = '${user.id}'`);
                message.reply('**аккаунт успешно удалён!**');
                message.delete();
                load_passwords();
                // Отправка пользователю информацию о том, что ему удалили профиль
                const embed = new Discord.RichEmbed().setColor('#ffffff').setTitle(`**${bot.guilds.get("600410517970092052").emojis.find(e => e.name == "modhelper_cross")} Удаление аккаунта.**`).setDescription(`**<@${user.id}>, ваш аккаунт удалён из базы данных бота!**`).setTimestamp().setFooter("ModHelper Info");
                user.send(embed).catch(err => {
                    message.guild.channels.find(c => c.name == "general").send(embed);
                });
            }
        });
    }


    // Модераторские команды.
    if (command == '!modpanel') {
        if (!message.member.roles.some(r => ["Spectator™", "Support Team"].includes(r.name))) { // ПРОВЕРКА НА РОЛЬ
            message.reply('**недостаточно прав доступа!**');
            return message.delete();
        }
        if (message.channel.name != 'spectator-chat') return message.reply(`**можно использовать только в <#528637296098934793>**`) && message.delete();

        let profile = _passwords.find(user => user.userid == message.author.id); // НЕТ В БАЗЕ ДАННЫХ
        if (!profile) {
            message.guild.channels.find(c => c.name == "spectator-chat").send(`**<@${message.author.id}>, ваш аккаунт не был найден в базе данных!**`);
            return message.delete();
        }
        if (auth_users.some(user => user.userid == message.author.id)) { // Уже авторизован 
            message.guild.channels.find(c => c.name == "spectator-chat").send(`**<@${message.author.id}>, вы уже авторизованы!**`);
            return message.delete();
        }
        const password = message.content.split(/ +/).slice(1).join(" ");
        if (!password) { // Не указан пароль
            message.guild.channels.find(c => c.name == "spectator-chat").send(`**<@${message.author.id}>, вы не указали пароль. !modpanel [password]**`);
            return message.delete();
        }
        if (md5(password) != profile.password) { // Неверный пароль
            message.guild.channels.find(c => c.name == "spectator-chat").send(`**<@${message.author.id}>, неверный пароль!**`);
            return message.delete();
        }
        auth_users.push(profile); // Прошел авторизацию
        message.guild.channels.find(c => c.name == "spectator-chat").send(`**<@${message.author.id}>, вы авторизованы!**`);
        return message.delete();
    }

    if (command == '!mm') {
        if (!message.member.roles.some(r => ["Spectator™", "Support Team"].includes(r.name))) { // ПРОВЕРКА НА РОЛЬ
            message.reply('**недостаточно прав доступа!**');
            return message.delete();
        }
        if (message.channel.name != 'spectator-chat') return message.reply(`**можно использовать только в <#528637296098934793>**`) && message.delete();

        let profile = _passwords.find(user => user.userid == message.author.id); // НЕТ В БАЗЕ ДАННЫХ 
        if (!profile) {
            message.guild.channels.find(c => c.name == "spectator-chat").send(`**<@${message.author.id}>, ваш аккаунт не был найден в базе данных!**`);
            return message.delete();
        }
        if (!auth_users.some(user => user.userid == message.author.id)) { // НЕ АВТОРИЗОВАН
            message.guild.channels.find(c => c.name == "spectator-chat").send(`**<@${message.author.id}>, вы не авторизованы!**`);
            return message.delete();
        }
        // Авторизован
        const embed = new Discord.RichEmbed().setAuthor(`Main Menu`, `https://i.yapx.ru/FAgHo.png`).setColor('#ffffff').setTimestamp().setFooter(message.author.tag, message.author.avatarURL)
        if (auth_users.find(user => user.userid == message.author.id)) {
            embed.setDescription(`**Ваш никнейм: <@${message.author.id}>**\n**Ваша должность: ${levels[auth_users.find(user => user.userid == message.author.id).level]} \n Статистика - [click](https://robo-hamster.ru/admin/index.php)**`);
        }
        message.channel.send(embed);
        return message.delete();
    }
});

bot.on('message', async message => {
    if (message.channel.type == "dm") return
    if (message.content.startsWith("!pro")) {
        if (!message.member.roles.some(r => ["Support Team", "Spectator™", "Discord Guardian", "Developer Robo-Hamster"].includes(r.name))) {
            message.reply('**недостаточно прав доступа!**');
            return message.delete();
        }
        let user = message.guild.member(message.mentions.users.first());
        if (!user) {
            message.reply('**пользователь не указан!**');
            return message.delete();
        }
        message.delete();
        const automessage = new Discord.RichEmbed().setColor("#23ff00").setDescription(`**- 1. Для начала пишем команду /authme и нажимаем на Enter.\n- 2. Далее бот Вам отправит ссылку с авторизацией.\n- 3. Далее Вы переходите по ссылке и авторизуетесь, готово.\n- 4. После авторизации бот выдаст автоматически роль ${message.guild.roles.get('574564467346505748')}.**`)
        message.channel.send(`${user}, **вот инструкция как получить роль "Проверенный 🔐".**`, automessage);
        hooklogs.sendSlackMessage({ 'username': 'ModHelperLogs', 'attachments': [{ 'pretext': `**Модератор <@${message.member.id}> отправил пользователю <@${user.id}> инструкцию на получение роли ${message.guild.roles.get('574564467346505748')} в канале <#${message.channel.id}>.**`, 'color': '#FFFFFF', 'footer': 'ModHelperLogs', 'ts': Date.now() / 1000 }] })
    }
});
bot.on('message', async message => {
    if (message.channel.type == "dm") return
    if (message.content.startsWith("!forma")) {
        if (!message.member.roles.some(r => ["Support Team", "Spectator™", "Discord Guardian", "Developer Robo-Hamster"].includes(r.name))) {
            message.reply('**недостаточно прав доступа!**');
            return message.delete();
        }
        let user = message.guild.member(message.mentions.users.first());
        if (!user) {
            message.reply('**пользователь не указан!**');
            return message.delete();
        }
        message.delete(); // Удаление команды если нет SP
        const automessage = new Discord.RichEmbed().setColor("#ffffff").setDescription(`**- 1. Для начала пишем команду /nick.\n- 2. Ставим тег организации: /nick [Организация].\n- 3. После организации пишем ваш ник: /nick [Организация] Nick_Name.\n- 4. После ника пишем ранг: /nick [Организация] Nick_Name [4/10]\n- 5. Прописываем то что получилось:\n/nick [Организация] Nick_Name [4/10] и нажимаем Enter.\n- И запросите роль словом "роль" в чате, после ожидайте выдачу роли модератором**`)
        message.channel.send(`${user}, **вот инструкция как сделать ник по форме.**`, automessage);
        hooklogs.sendSlackMessage({ 'username': 'ModHelperLogs', 'attachments': [{ 'pretext': `**Модератор <@${message.member.id}> отправил пользователю <@${user.id}> инструкцию на получение роли в канале <#${message.channel.id}>.**`, 'color': '#FFFFFF', 'footer': 'ModHelperLogs', 'ts': Date.now() / 1000 }] })
    }
});
bot.on('message', async message => {
    if (message.channel.type == "dm") return
    if (message.content.startsWith("!chat")) {
        if (!message.member.roles.some(r => ["Support Team", "Spectator™", "Discord Guardian", "Developer Robo-Hamster"].includes(r.name))) {
            return message.reply('**доступно только модераторам!**') && message.delete();
        }
        if (!message.member.roles.some(r => ["Support Team", "Discord Guardian", "Developer Robo-Hamster"].includes(r.name))) {
            return message.reply('**доступно с должности Support Team и выше.**') && message.delete();
        }
        const args = message.content.slice(`!chat`).split(/ +/);
        if (args[1] !== 'on' && args[1] !== 'off') return message.reply(`**правильное использование: !chat [on/off]**`) && message.delete();
        // Включение
        if (args[1] == 'on') {
            message.channel.overwritePermissions(message.guild.defaultRole, {
                SEND_MESSAGES: null,
                ADD_REACTIONS: true,
            })
            hooklogs.sendSlackMessage({ 'username': 'ModHelperLogs', 'attachments': [{ 'pretext': `**Модератор <@${message.member.id}> открыл канал: <#${message.channel.id}>.**`, 'color': '#FFFFFF', 'footer': 'ModHelperLogs', 'ts': Date.now() / 1000 }] })
            message.reply(`**вы успешно открыли данный канал!**`)
            return message.delete();
            // выключение
        } else if (args[1] == 'off') {
            message.channel.overwritePermissions(message.guild.defaultRole, {
                SEND_MESSAGES: false,
                ADD_REACTIONS: false,
            })
            hooklogs.sendSlackMessage({ 'username': 'ModHelperLogs', 'attachments': [{ 'pretext': `**Модератор <@${message.member.id}> закрыл канал: <#${message.channel.id}>.**`, 'color': '#FFFFFF', 'footer': 'ModHelperLogs', 'ts': Date.now() / 1000 }] })
            message.reply(`**вы успешно закрыли данный канал!**`)
            return message.delete();
        }
    }
});



/*
секция с вебхуками
*/
const hook = new Discord.WebhookClient('629926893587660821', '-Q9NEH7-Ujp4jmzQrr4WAqY5TOJUdnH_g9Z-F7LgodIKY3IYFtJ2ZVK5b9qzJp8A_DDz'); // вебхук ModHelperInfo
const hooklogs = new Discord.WebhookClient('630000026239893524', 'r2fZ4AmrwyBy8tnVuC1JpqDSguZ36gQGuN3YFHMfnyyISON5EM9ZPTWQ0owj68Xic_tt'); // вебхук ModHelperInfo

hook.sendSlackMessage({
    'username': 'ModHelperInfo',
    'attachments': [{ 'pretext': 'ModHelper успешно запущен.', 'color': '#FFFFFF', 'ts': Date.now() / 1000 }]
}).catch(console.error);

bot.on('message', async message => {
    if (message.channel.type == "dm") return // Если в ЛС, то выход.
    if (message.content.startsWith("!hook")) { // сама команда
        if (!message.member.roles.some(r => ["Developer Robo-Hamster"].includes(r.name))) { // ПРОВЕРКА НА РОЛЬ
            message.reply('**недостаточно прав доступа!**');
            return message.delete();
        }
        hook.sendSlackMessage({
            'username': 'ModHelperInfo',
            'attachments': [{
                'pretext': 'TEXT',
                'color': '#FFFFFF',
                'footer_icon': 'https://cdn.discordapp.com/emojis/611162976661143582.png?v=1',
                'footer': 'ModHelper',
                'ts': Date.now() / 1000
            }]
        })
    }
});
