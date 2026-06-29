import math
import os
from PIL import Image, ImageDraw, ImageFilter

# Palette de l'app (identité validée : fond lavande clair, Elle = rose, Lui = bleu).
BG_COLOR   = (246, 245, 255)   # #F6F5FF — blanc lavande
ELLE_COLOR = (232, 67, 117)    # #E84375 — rose
LUI_COLOR  = (66, 120, 196)    # #4278C4 — bleu

def draw_icon(size, output_path):
    # Travailler en super-sampling 4x pour avoir un antialiasing parfait
    FACTOR = 4
    S = size * FACTOR

    # Créer l'image en mode RGBA (fond lavande clair à la fin)
    img = Image.new('RGBA', (S, S), (*BG_COLOR, 255))
    draw = ImageDraw.Draw(img)

    # 1. Halo radial central (rose doux)
    # Un seul disque rose, fortement flouté → glow régulier qui s'estompe vers les
    # bords, sans banding ni anneau dur (l'empilement de disques concentriques
    # saturait sur fond clair).
    center_x, center_y = S // 2, S // 2
    halo_img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    halo_draw = ImageDraw.Draw(halo_img)
    halo_r = int(S * 0.32)
    halo_draw.ellipse(
        [center_x - halo_r, center_y - halo_r, center_x + halo_r, center_y + halo_r],
        fill=(*ELLE_COLOR, 40)
    )
    halo_img = halo_img.filter(ImageFilter.GaussianBlur(S * 0.10))
    img = Image.alpha_composite(img, halo_img)
    draw = ImageDraw.Draw(img)
            
    W = S * 0.82
    H = S * 0.40
    OX = (S - W) / 2
    OY = S / 2
    
    # 2. Dessiner l'ombre de la courbe "Elle" (or) sur un calque séparé
    shadow_img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_img)
    
    # Points de la courbe "Elle" (or)
    elle_points = []
    for i in range(101):
        t = i / 100.0
        x = OX + t * W
        y = OY - math.sin(t * math.pi * 2) * (H * 0.55)
        elle_points.append((x, y))
        
    # Dessiner la courbe rose sur le calque d'ombre en couleur rose semi-transparente (glow doux)
    shadow_color = (*ELLE_COLOR, 56) # ~22% opacity
    shadow_width = int(S * 0.030)
    for j in range(len(elle_points) - 1):
        shadow_draw.line([elle_points[j], elle_points[j+1]], fill=shadow_color, width=shadow_width, joint="round")
        
    # Flouter le calque d'ombre pour simuler shadowBlur = S * 0.06 (ramené à l'échelle super-samplée)
    blur_radius = (size * 0.06) * FACTOR
    if blur_radius > 0:
        shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(blur_radius))
        
    # Superposer l'ombre
    img = Image.alpha_composite(img, shadow_img)
    draw = ImageDraw.Draw(img)
    
    # 3. Dessiner la courbe "Lui" (sauge)
    lui_points = []
    phase_lui = math.pi * 0.65
    for i in range(101):
        t = i / 100.0
        x = OX + t * W
        y = OY - math.sin(t * math.pi * 2 + phase_lui) * (H * 0.40)
        lui_points.append((x, y))
        
    lui_color = (*LUI_COLOR, 217) # 85% opacity
    lui_width = int(S * 0.022)
    for j in range(len(lui_points) - 1):
        draw.line([lui_points[j], lui_points[j+1]], fill=lui_color, width=lui_width, joint="round")
        
    # 4. Dessiner la courbe "Elle" (rose) au premier plan
    elle_color = (*ELLE_COLOR, 255) # 100% opacity
    elle_width = int(S * 0.030)
    for j in range(len(elle_points) - 1):
        draw.line([elle_points[j], elle_points[j+1]], fill=elle_color, width=elle_width, joint="round")
        
    # 5. Points de rencontre (dots)
    # Dot 1 (or)
    dot1_x = OX + W * 0.25
    dot1_y = OY - math.sin(0.25 * math.pi * 2) * H * 0.55
    dot1_r = int(S * 0.028)
    draw.ellipse([dot1_x - dot1_r, dot1_y - dot1_r, dot1_x + dot1_r, dot1_y + dot1_r], fill=elle_color)
    
    # Dot 2 (bleu)
    dot2_x = OX + W * 0.75
    dot2_y = OY - math.sin(0.75 * math.pi * 2 + phase_lui) * H * 0.40
    dot2_r = int(S * 0.022)
    draw.ellipse([dot2_x - dot2_r, dot2_y - dot2_r, dot2_x + dot2_r, dot2_y + dot2_r], fill=(*LUI_COLOR, 255))
    
    # 6. Réduire à la taille cible avec un filtrage Lanczos haute qualité
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    final_img.convert('RGB').save(output_path, 'PNG')
    print(f"Icône générée avec succès : {output_path} ({size}x{size})")

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    icons_dir = os.path.join(base_dir, 'icons')
    os.makedirs(icons_dir, exist_ok=True)
    
    draw_icon(192, os.path.join(icons_dir, 'icon-192.png'))
    draw_icon(512, os.path.join(icons_dir, 'icon-512.png'))
    draw_icon(180, os.path.join(icons_dir, 'apple-touch-icon.png'))
