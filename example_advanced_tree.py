"""
Exemplo Avançado: Árvore Binária com atributos adicionais

Este exemplo mostra uma árvore com mais atributos como altura e balanceamento,
útil para visualizar árvores AVL ou Red-Black.
"""

class AdvancedTreeNode:
    """Nó de árvore binária com atributos adicionais"""
    def __init__(self, val=0, left=None, right=None, height=1):
        self.val = val
        self.left = left
        self.right = right
        self.height = height  # Altura do nó
        self.balance_factor = 0  # Fator de balanceamento
    
    def __repr__(self):
        return f"AdvancedTreeNode(val={self.val}, height={self.height}, balance={self.balance_factor})"


def calculate_height(node):
    """Calcula a altura de um nó"""
    if node is None:
        return 0
    return max(
        calculate_height(node.left) if node.left else 0,
        calculate_height(node.right) if node.right else 0
    ) + 1


def calculate_balance_factor(node):
    """Calcula o fator de balanceamento de um nó"""
    if node is None:
        return 0
    
    left_height = calculate_height(node.left) if node.left else 0
    right_height = calculate_height(node.right) if node.right else 0
    
    return left_height - right_height


def update_tree_attributes(root):
    """Atualiza altura e fator de balanceamento de todos os nós"""
    if root is None:
        return
    
    update_tree_attributes(root.left)
    update_tree_attributes(root.right)
    
    root.height = calculate_height(root)
    root.balance_factor = calculate_balance_factor(root)


def create_advanced_tree():
    """
    Cria uma árvore com atributos adicionais:
    
          10
         /  \
        5    20
       / \   / \
      2   7 15  25
         /
        6
    """
    root = AdvancedTreeNode(10)
    root.left = AdvancedTreeNode(5)
    root.right = AdvancedTreeNode(20)
    root.left.left = AdvancedTreeNode(2)
    root.left.right = AdvancedTreeNode(7)
    root.left.right.left = AdvancedTreeNode(6)
    root.right.left = AdvancedTreeNode(15)
    root.right.right = AdvancedTreeNode(25)
    
    # Atualizar atributos
    update_tree_attributes(root)
    
    return root


def find_unbalanced_nodes(root, unbalanced_list):
    """Encontra nós desbalanceados (balance_factor != -1, 0, 1)"""
    if root is None:
        return
    
    if abs(root.balance_factor) > 1:
        unbalanced_list.append(root)
    
    find_unbalanced_nodes(root.left, unbalanced_list)
    find_unbalanced_nodes(root.right, unbalanced_list)


def main():
    print("=== Exemplo Avançado: Árvore com Atributos Adicionais ===")
    
    # Criar árvore avançada
    print("\n1. Criando árvore com atributos (altura, balanceamento)...")
    advanced_root = create_advanced_tree()
    
    # SETE UM BREAKPOINT AQUI para visualizar 'advanced_root'
    print("Árvore criada! Defina um breakpoint aqui para visualizar 'advanced_root'")
    print(f"Raiz: valor={advanced_root.val}, altura={advanced_root.height}, balance={advanced_root.balance_factor}")
    
    # Encontrar nós desbalanceados
    print("\n2. Procurando nós desbalanceados...")
    unbalanced = []
    find_unbalanced_nodes(advanced_root, unbalanced)
    
    # SETE UM BREAKPOINT AQUI para ver nós desbalanceados
    print(f"Encontrados {len(unbalanced)} nós desbalanceados")
    print("Defina um breakpoint aqui para visualizar 'unbalanced'")
    
    for node in unbalanced:
        print(f"  - Nó {node.val}: balance_factor={node.balance_factor}")
    
    # Criar subárvore
    print("\n3. Trabalhando com subárvore...")
    left_subtree = advanced_root.left
    
    # SETE UM BREAKPOINT AQUI para visualizar subárvore
    print("Subárvore esquerda! Defina um breakpoint aqui para visualizar 'left_subtree'")
    print(f"Subárvore: valor={left_subtree.val}, altura={left_subtree.height}")
    
    print("\n=== Fim do exemplo avançado ===")
    print("\n💡 VARIÁVEIS PARA VISUALIZAR:")
    print("- 'advanced_root': Árvore completa com atributos")
    print("- 'unbalanced': Lista de nós desbalanceados")
    print("- 'left_subtree': Subárvore esquerda")


if __name__ == "__main__":
    main()

