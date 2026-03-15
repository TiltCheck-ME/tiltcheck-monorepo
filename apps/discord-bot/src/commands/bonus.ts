
data: new SlashCommandBuilder()
    .setName('bonus')
    .setDescription('Track your bonus timers so you don't miss a single f***ing dollar.')
    .addSubcommand(sub =>
        sub
            .setName('list')
            .setDescription('List all available casino bonuses')
    )
    .addSubcommand(sub =>
        sub
            .setName('ready')
            .setDescription('Show bonuses that are ready to claim right now')
    )
    .addSubcommand(sub =>
        sub
            .setName('claim')
            .setDescription('Mark a bonus as claimed to start the timer')
            .addStringOption(opt =>
                opt
                    .setName('casino')
                    .setDescription('Name of the casino')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
    )
    .addSubcommand(sub =>
        sub
            .setName('timers')
            .setDescription('View all your active bonus timers')
    )
    .addSubcommand(sub =>
        sub
            .setName('notify')
            .setDescription('Manage your bonus notifications')
            .addStringOption(opt =>
                opt
                    .setName('casino')
                    .setDescription('Name of the casino')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addBooleanOption(opt =>
                opt
                    .setName('enabled')
                    .setDescription('Enable or disable notifications for this casino')
                    .setRequired(true)
            )
    )
    .addSubcommand(sub =>
        sub
            .setName('stats')
            .setDescription('View your bonus claim statistics')
    ),
