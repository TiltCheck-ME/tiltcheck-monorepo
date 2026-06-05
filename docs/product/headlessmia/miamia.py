import datetime
import random
import time
import tkinter as tk
import winsound
from PIL import ImageGrab

# --- CONFIGURATION ---
# 1. Update these to the exact X,Y coordinates of the purple strip on the left side of the MiaCat embed card
TARGET_X = 500  
TARGET_Y = 400  

# 2. The exact RGB values of the purple embed boundary line
# (You can tweak these values based on a screenshot color picker)
TARGET_COLOR = (114, 137, 218)  # Default Discord Blurple/Purple shade
COLOR_TOLERANCE = 15             # Allows a tiny bit of variance in lighting

def get_current_hour_cst():
    """Gets the current hour adjusted to Central Standard Time."""
    # Calculates rough CST from your local machine time
    now = datetime.datetime.now()
    return now.hour

def is_active_window():
    """Validates the target high-traffic gaming windows (5-11 AM and 9 PM-3 AM CST)."""
    current_hour = get_current_hour_cst()
    if 5 <= current_hour < 11:
        return True
    if current_hour >= 21 or current_hour < 3:
        return True
    return False

def generate_picks():
    """Selects 10 unique board numbers from 1-40 with mixed layout styles."""
    pool = list(range(1, 41))
    selected = random.sample(pool, 10)
    
    # 75% chance to sort, 25% chance to scramble layout
    if random.random() < 0.25:
        random.shuffle(selected)
    else:
        selected.sort()
        
    style = random.choice(["spaces", "commas"])
    if style == "spaces":
        return " ".join(map(str, selected))
    else:
        return ", ".join(map(str, selected))

class KemeowHelperApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Kemeow Companion")
        self.root.attributes("-topmost", True)  # Forces window to stay on top
        self.root.geometry("300x150+50+50")     # Compact window in upper-left corner
        
        self.label = tk.Label(root, text="Waiting for game...", font=("Arial", 12), fg="gray")
        self.label.pack(pady=20)
        
        self.display_text = tk.Entry(root, font=("Arial", 14), justify="center")
        self.display_text.pack(pady=5, fill=tk.X, padx=10)        
        self.cooldown = False
        self.check_loop()

    def flash_screen(self, count=0):
        """Flashes the helper window window red and white rapidly to grab attention."""
        if count < 6:
            current_color = self.root.cget("bg")
            next_color = "red" if current_color != "red" else "white"
            self.root.config(bg=next_color)
            self.label.config(bg=next_color)
            self.root.after(150, lambda: self.flash_screen(count + 1))
        else:
            # Reset back to default system layout colors
            self.root.config(bg="SystemButtonFace")
            self.label.config(bg="SystemButtonFace", fg="black")

    def trigger_alert(self):
        """Fires motherboard hardware sound and copies text data."""
        if self.cooldown:
            return
            
        self.cooldown = True
        picks = generate_picks()
        
        # Update UI window elements
        self.label.config(text="🔥 ENTRY OPEN! COPIED! 🔥", fg="red")
        self.display_text.delete(0, tk.END)
        self.display_text.insert(0, picks)
        
        # Inject directly into Windows Clipboard system memory buffer
        self.root.clipboard_clear()
        self.root.clipboard_append(picks)
        
        # Flash window visually
        self.flash_screen()
        
        # Force a direct physical motherboard hardware beep (Frequency 1200Hz, Duration 600ms)
        # This completely ignores taskbar OS sound muting
        try:
            winsound.Beep(1200, 600)
        except Exception:
            pass # Fallback safe if machine lacks a piezo internal buzzer

        # Set a 45-second cooldown safety so it doesn't double-trigger on countdown updates
        self.root.after(45000, self.reset_cooldown)

    def reset_cooldown(self):
        self.cooldown = False
        self.label.config(text="Waiting for game...", fg="gray")

    def check_loop(self):
        """Grabs the individual pixel color coordinate frame to look for match events."""
        if is_active_window() and not self.cooldown:
            try:
                # Grab a tiny 1x1 image sample directly from your monitor coordinates
                bbox = (TARGET_X, TARGET_Y, TARGET_X + 1, TARGET_Y + 1)
                img = ImageGrab.grab(bbox=bbox)
                pixel = img.getpixel((0, 0))
                
                # Math variance match comparison
                r_diff = abs(pixel[0] - TARGET_COLOR[0])
                g_diff = abs(pixel[1] - TARGET_COLOR[1])
                b_diff = abs(pixel[2] - TARGET_COLOR[2])
                
                if r_diff <= COLOR_TOLERANCE and g_diff <= COLOR_TOLERANCE and b_diff <= COLOR_TOLERANCE:
                    self.trigger_alert()
            except Exception:
                pass
                
        # Loop check every 500 milliseconds
        self.root.after(500, self.check_loop)

if __name__ == "__main__":
    root = tk.Tk()
    app = KemeowHelperApp(root)
    root.mainloop()