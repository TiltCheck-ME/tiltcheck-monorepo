
data: new SlashCommandBuilder()
    .setName('buddy')
    .setDescription('Get an accountability buddy to save you from yourself (or let you know when you're being a degenerate)')
    .addSubcommand(sub =>
        sub
            .setName('add')
            .setDescription('Hook up with a buddy to let them know when you're about to lose your sh**')
            .addUserOption(opt =>
                opt
                    .setName('user')
                    .setDescription('The user you want to add as a buddy')
                    .setRequired(true)
            )
    )
    .addSubcommand(sub =>
        sub
            .setName('remove')
            .setDescription('Ditch a buddy. They probably couldn't save you anyway.')
            .addUserOption(opt =>
                opt
                    .setName('user')
                    .setDescription('The buddy to remove')
                    .setRequired(true)
            )
    )
    .addSubcommand(sub =>
        sub
            .setName('list')
            .setDescription('See who's got your back (or who you're stuck with).')
    )
    .addSubcommand(sub =>
        sub
            .setName('test')
            .setDescription('Test if your buddy's actually watching. (It's a simulation, don't panic.)')
            .addUserOption(opt =>
                opt
                    .setName('buddy')
                    .setDescription('The buddy to test alert')
                    .setRequired(true)
            )
    ),
