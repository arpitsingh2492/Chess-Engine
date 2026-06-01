import os

HEADER = """/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

"""

def add_header(directory):
    count = 0
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in root or '.git' in root or 'dist' in root or 'build' in root or 'build_wasm' in root:
            continue
        for file in files:
            if file.endswith(('.cpp', '.h', '.ts', '.tsx', '.css')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Avoid adding multiple times if run repeatedly
                    if not content.startswith("/*\n * ASTRA - Chess Engine by arpitsingh2492\n */"):
                        new_content = HEADER + content
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        count += 1
                except Exception as e:
                    print(f"Failed {filepath}: {e}")
    print(f"Added header to {count} files.")

add_header('d:/Chess')
