"""
Exemplo de Árvore Binária para testar a extensão Debug Data Structures Visualizer

Este código cria uma árvore binária simples e permite visualizá-la durante o debug.
"""

class TreeNode:
    """Nó de uma árvore binária"""
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
    
    def __repr__(self):
        return f"TreeNode({self.val})"


def create_sample_tree():
    """
    Cria uma árvore binária de exemplo:
    
          1
         / \
        2   3
       / \
      4   5
    """
    root = TreeNode(1)
    root.left = TreeNode(2)
    root.right = TreeNode(3)
    root.left.left = TreeNode(4)
    root.left.right = TreeNode(5)
    return root


def create_bst():
    """
    Cria uma Binary Search Tree (BST) de exemplo:
    
          8
         / \
        3   10
       / \    \
      1   6    14
         / \  /
        4   7 13
    """
    root = TreeNode(8)
    root.left = TreeNode(3)
    root.right = TreeNode(10)
    root.left.left = TreeNode(1)
    root.left.right = TreeNode(6)
    root.left.right.left = TreeNode(4)
    root.left.right.right = TreeNode(7)
    root.right.right = TreeNode(14)
    root.right.right.left = TreeNode(13)
    return root


def create_avl_tree():
    """
    Cria uma árvore AVL de exemplo com altura balanceada:
    
          10
         /  \
        5    20
       / \   / \
      2   7 15  25
    """
    root = TreeNode(10)
    root.left = TreeNode(5)
    root.right = TreeNode(20)
    root.left.left = TreeNode(2)
    root.left.right = TreeNode(7)
    root.right.left = TreeNode(15)
    root.right.right = TreeNode(25)
    return root


def insert_bst(root, val):
    """Insere um valor na BST"""
    if root is None:
        return TreeNode(val)
    
    if val < root.val:
        root.left = insert_bst(root.left, val)
    else:
        root.right = insert_bst(root.right, val)
    
    return root


def search_bst(root, val):
    """Busca um valor na BST"""
    if root is None or root.val == val:
        return root
    
    if val < root.val:
        return search_bst(root.left, val)
    else:
        return search_bst(root.right, val)


def inorder_traversal(root):
    """Percorre a árvore em ordem (inorder)"""
    if root:
        inorder_traversal(root.left)
        print(root.val, end=' ')
        inorder_traversal(root.right)


def main():
    print("=== Exemplo de Árvore Binária ===")
    
    # Criar árvore simples
    print("\n1. Criando árvore binária simples...")
    root = create_sample_tree()
    
    # ⚠️ IMPORTANTE: SETE UM BREAKPOINT NA LINHA ABAIXO (linha 121)
    # O breakpoint DEVE estar DEPOIS da criação da variável 'root'
    # para que ela esteja no escopo quando o debugger parar
    print("Árvore criada! Defina um breakpoint aqui para visualizar 'root'")
    print(f"Valor da raiz: {root.val}")  # ← BREAKPOINT AQUI (linha 121)
    
    # Criar BST
    print("\n2. Criando Binary Search Tree...")
    bst_root = create_bst()
    
    # SETE UM BREAKPOINT AQUI para visualizar 'bst_root'
    print("BST criada! Defina um breakpoint aqui para visualizar 'bst_root'")
    print(f"Valor da raiz BST: {bst_root.val}")
    
    # Criar árvore AVL
    print("\n3. Criando árvore AVL...")
    avl_root = create_avl_tree()
    
    # SETE UM BREAKPOINT AQUI para visualizar 'avl_root'
    print("Árvore AVL criada! Defina um breakpoint aqui para visualizar 'avl_root'")
    print(f"Valor da raiz AVL: {avl_root.val}")
    
    # Operações na BST
    print("\n4. Inserindo valores na BST...")
    bst_root = insert_bst(bst_root, 9)
    bst_root = insert_bst(bst_root, 12)
    
    # SETE UM BREAKPOINT AQUI para ver a BST após inserções
    print("Valores inseridos! Defina um breakpoint aqui para ver a BST atualizada")
    
    # Buscar na BST
    print("\n5. Buscando valor na BST...")
    result = search_bst(bst_root, 6)
    
    # SETE UM BREAKPOINT AQUI para ver o resultado da busca
    if result:
        print(f"Valor 6 encontrado! Defina um breakpoint aqui para ver 'result'")
    else:
        print("Valor 6 não encontrado")
    
    # Percorrer árvore
    print("\n6. Percorrendo BST em ordem:")
    inorder_traversal(bst_root)
    print()
    
    # Árvore vazia
    print("\n7. Criando árvore vazia (None)...")
    empty_tree = None
    
    # SETE UM BREAKPOINT AQUI para testar árvore vazia
    print("Árvore vazia criada! Defina um breakpoint aqui para visualizar 'empty_tree'")
    
    print("\n=== Fim do exemplo ===")
    print("\n💡 DICAS PARA USAR A EXTENSÃO:")
    print("1. Defina breakpoints nas linhas marcadas com 'SETE UM BREAKPOINT AQUI'")
    print("2. Inicie o debug (F5)")
    print("3. Quando o debugger parar, pressione Ctrl+Alt+V (ou Cmd+Opt+V no Mac)")
    print("4. Digite o nome da variável que deseja visualizar:")
    print("   - 'root' para a árvore simples")
    print("   - 'bst_root' para a Binary Search Tree")
    print("   - 'avl_root' para a árvore AVL")
    print("   - 'result' para ver o nó encontrado na busca")
    print("5. Clique nos nós da visualização para ver seus atributos")


if __name__ == "__main__":
    main()

