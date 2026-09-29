import os
import glob
import re

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Text colors
    content = content.replace('text-slate-900', 'text-slate-100')
    content = content.replace('text-slate-800', 'text-slate-200')
    content = content.replace('text-slate-700', 'text-slate-300')
    content = content.replace('text-slate-600', 'text-slate-400')
    
    # Borders
    content = content.replace('border-slate-200', 'border-slate-700/50')
    content = content.replace('border-slate-100', 'border-slate-700/30')
    
    # Backgrounds
    content = content.replace('bg-white', 'bg-[#1e293b]')
    content = content.replace('bg-slate-50/70', 'bg-slate-800/50')
    content = content.replace('bg-slate-50/50', 'bg-slate-800/30')
    content = content.replace('bg-slate-50', 'bg-slate-800')
    content = content.replace('bg-[#F5F8FC]', 'bg-slate-900')
    content = content.replace('bg-slate-100', 'bg-slate-800')
    
    # Accent colors (sky to emerald/teal for premium look, wait user liked the dark blue/emerald)
    content = content.replace('bg-sky-50', 'bg-emerald-500/10')
    content = content.replace('text-sky-700', 'text-emerald-400')
    content = content.replace('text-sky-600', 'text-emerald-400')
    content = content.replace('hover:bg-sky-700', 'hover:bg-emerald-600')
    content = content.replace('bg-sky-600', 'bg-emerald-500')
    
    # Red/Alert colors
    content = content.replace('bg-red-50', 'bg-red-500/10')
    content = content.replace('border-red-200', 'border-red-500/20')
    content = content.replace('border-red-300', 'border-red-500/30')
    content = content.replace('text-red-900', 'text-red-400')
    content = content.replace('text-red-700', 'text-red-400')
    
    # Amber/Warning colors
    content = content.replace('bg-amber-50', 'bg-amber-500/10')
    content = content.replace('border-amber-200', 'border-amber-500/20')
    content = content.replace('border-amber-300', 'border-amber-500/30')
    content = content.replace('text-amber-900', 'text-amber-400')
    content = content.replace('text-amber-700', 'text-amber-400')
    
    # Emerald/Success colors
    content = content.replace('bg-emerald-50', 'bg-emerald-500/10')
    content = content.replace('border-emerald-200', 'border-emerald-500/20')
    content = content.replace('border-emerald-300', 'border-emerald-500/30')
    content = content.replace('text-emerald-900', 'text-emerald-400')
    content = content.replace('text-emerald-700', 'text-emerald-400')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

base_dir = r"d:\MainProjectMl\ProjectCode\frontend\src"
for root, _, files in os.walk(base_dir):
    for file in files:
        if file.endswith('.jsx'):
            filepath = os.path.join(root, file)
            # Skip Layout, Header, Sidebar as they are manually tuned
            if file in ['MainLayout.jsx', 'Header.jsx', 'Sidebar.jsx']:
                continue
            replace_in_file(filepath)
            print(f"Updated {filepath}")
