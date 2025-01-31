import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, updateDoc, deleteDoc, doc, collectionData, query, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Product } from './product.service';

export interface OrderItem {
  product: Product;
  quantity: number;
}

export type OrderStatus = 'canceled' | 'in_progress' | 'delivering' | 'delivered';

export interface Order {
  id?: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  constructor(private firestore: Firestore) {}

  // Criar um novo pedido
  async createOrder(order: Omit<Order, 'id'>) {
    const ordersRef = collection(this.firestore, 'orders');
    return addDoc(ordersRef, {
      ...order,
      status: 'in_progress',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Obter todos os pedidos
  getAllOrders(): Observable<Order[]> {
    const ordersRef = collection(this.firestore, 'orders');
    return collectionData(ordersRef, { idField: 'id' }) as Observable<Order[]>;
  }

  // Obter pedidos por status
  getOrdersByStatus(status: OrderStatus): Observable<Order[]> {
    const ordersRef = collection(this.firestore, 'orders');
    const q = query(ordersRef, where('status', '==', status));
    return collectionData(q, { idField: 'id' }) as Observable<Order[]>;
  }

  // Obter pedidos do usuário por status
  getUserOrdersByStatus(userId: string, status: OrderStatus): Observable<Order[]> {
    const ordersRef = collection(this.firestore, 'orders');
    const q = query(ordersRef, 
      where('userId', '==', userId),
      where('status', '==', status)
    );
    return collectionData(q, { idField: 'id' }) as Observable<Order[]>;
  }

  // Obter pedidos do usuário
  getUserOrders(userId: string): Observable<Order[]> {
    const ordersRef = collection(this.firestore, 'orders');
    const q = query(ordersRef, where('userId', '==', userId));
    return collectionData(q, { idField: 'id' }) as Observable<Order[]>;
  }

  // Atualizar status do pedido
  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const orderRef = doc(this.firestore, `orders/${orderId}`);
    return updateDoc(orderRef, { 
      status,
      updatedAt: new Date()
    });
  }

  // Cancelar pedido
  async cancelOrder(orderId: string) {
    return this.updateOrderStatus(orderId, 'canceled');
  }

  // Marcar pedido como em entrega
  async markAsDelivering(orderId: string) {
    return this.updateOrderStatus(orderId, 'delivering');
  }

  // Marcar pedido como entregue
  async markAsDelivered(orderId: string) {
    return this.updateOrderStatus(orderId, 'delivered');
  }

  // Exportar pedidos para CSV
  async exportToSheet() {
    const orders = await this.getAllOrders().toPromise();
    if (!orders) return;

    const csvContent = this.convertToCSV(orders);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `pedidos_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private convertToCSV(orders: Order[]): string {
    const headers = [
      'ID',
      'Data',
      'Status',
      'Total',
      'Itens'
    ];

    const rows = orders.map(order => [
      order.id,
      order.createdAt.toLocaleString(),
      order.status,
      order.total.toFixed(2),
      order.items.map(item => `${item.product.name} (${item.quantity}x)`).join('; ')
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }
}