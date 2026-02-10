import discord
import os
import sys

# Use environment variable for token
TOKEN = os.getenv('DISCORD_TOKEN')
if not TOKEN:
    print("Error: DISCORD_TOKEN environment variable not set")
    sys.exit(1)

intents = discord.Intents.default()
bot = discord.Client(intents=intents)

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user}')
    
    # The Discord ID for @oknu
    user_id = 350270174462607360
    try:
        user = await bot.fetch_user(user_id)
        message = (
            "Hello from JustTheTip bot! 🎰\n\n"
            "This message is to confirm my application for the tip.cc API key.\n\n"
        )
        await user.send(message)
        print(f"✓ Sent DM to {user.name}")
    except discord.Forbidden:
        print(f"✗ Could not send DM. User has DMs disabled or blocked the bot.")
    except discord.NotFound:
        print(f"✗ User with ID {user_id} not found.")
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
    finally:
        # Close bot after sending message
        await bot.close()

bot.run(TOKEN)
