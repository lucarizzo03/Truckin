import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FinanceScreen = ({ navigation, completedLoads = [], invoices = []}) => {
  const [expenses, setExpenses] = useState([]);

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const totalEarnings = invoices
  .filter(inv => inv.status === 'paid')
  .reduce((sum, inv) => sum + (inv.amount || 0), 0);

  const pendingPayments = invoices
    .filter(inv => inv.status !== 'paid')
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);

  const netIncome = totalEarnings - totalExpenses;



  const expenseCategories = [
    { key: 'fuel', label: 'Fuel', icon: 'water', color: '#FF9500' },
    { key: 'maintenance', label: 'Maintenance', icon: 'construct', color: '#007AFF' },
    { key: 'meals', label: 'Meals', icon: 'restaurant', color: '#34C759' },
    { key: 'tolls', label: 'Tolls', icon: 'card', color: '#AF52DE' },
    { key: 'lodging', label: 'Lodging', icon: 'bed', color: '#FF3B30' },
    { key: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: '#666' },
  ];

  const handleAddExpense = (category) => {
    Alert.prompt(
      'Add Expense',
      `Enter amount for ${category.label}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (amount) => {
            if (amount && !isNaN(amount)) {
              const newExpense = {
                id: Date.now(),
                type: category.key,
                amount: parseFloat(amount),
                location: 'Current Location',
                date: 'Today',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                category: category.label,
              };
              setExpenses([newExpense, ...expenses]);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleInvoicePress = (invoice) => {
    Alert.alert(
      'Invoice Details',
      `Invoice: ${invoice.id}\nLoad: ${invoice.loadId}\nAmount: $${invoice.amount.toLocaleString()}\nStatus: ${invoice.status}\nDate: ${invoice.date}\nBroker: ${invoice.broker}`,
      [{ text: 'OK' }]
    );
  };

  const getExpenseIcon = (type) => {
    const category = expenseCategories.find(cat => cat.key === type);
    return category ? category.icon : 'ellipsis-horizontal';
  };

  const getExpenseColor = (type) => {
    const category = expenseCategories.find(cat => cat.key === type);
    return category ? category.color : '#666';
  };

  const renderExpenseItem = ({ item }) => (
    <View style={styles.expenseItem}>
      <View style={styles.expenseIcon}>
        <Ionicons 
          name={getExpenseIcon(item.type)} 
          size={24} 
          color={getExpenseColor(item.type)} 
        />
      </View>
      
      <View style={styles.expenseContent}>
        <View style={styles.expenseHeader}>
          <Text style={styles.expenseCategory}>{item.category}</Text>
          <Text style={styles.expenseAmount}>-${item.amount.toLocaleString()}</Text>
        </View>
        <Text style={styles.expenseLocation}>{item.location}</Text>
        <Text style={styles.expenseTime}>{item.date} at {item.time}</Text>
      </View>
    </View>
  );

  const renderInvoiceItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.invoiceItem} 
      onPress={() => handleInvoicePress(item)}
    >
      <View style={styles.invoiceHeader}>
        <Text style={styles.invoiceId}>{item.id}</Text>
        <View style={[
          styles.statusBadge,
          item.status === 'paid' ? styles.paidBadge : styles.pendingBadge
        ]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.invoiceDetails}>
        <Text style={styles.invoiceAmount}>${item.amount.toLocaleString()}</Text>
        <Text style={styles.invoiceBroker}>{item.broker}</Text>
        <Text style={styles.invoiceDate}>{item.date}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Finances</Text>
          <TouchableOpacity style={styles.reportsButton}>
            <Ionicons name="document-text" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Financial Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Financial Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Earnings</Text>
              <Text style={styles.summaryValue}>${totalEarnings.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Expenses</Text>
              <Text style={[styles.summaryValue, { color: '#FF3B30' }]}>-${totalExpenses.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Net Income</Text>
              <Text style={[styles.summaryValue, { color: '#34C759' }]}>${netIncome.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Pending</Text>
              <Text style={styles.summaryValue}>${pendingPayments.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Quick Add Expense */}
        <View style={styles.quickAddCard}>
          <Text style={styles.sectionTitle}>Quick Add Expense</Text>
          <View style={styles.categoryGrid}>
            {expenseCategories.map((category) => (
              <TouchableOpacity
                key={category.key}
                style={styles.categoryButton}
                onPress={() => handleAddExpense(category)}
              >
                <Ionicons name={category.icon} size={24} color={category.color} />
                <Text style={styles.categoryLabel}>{category.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Expenses */}
        <View style={styles.expensesCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={expenses.slice(0, 3)}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderExpenseItem}
            scrollEnabled={false}
          />
        </View>

        {/* Invoices */}
        <View style={styles.invoicesCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Invoices</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={invoices}
            keyExtractor={(item) => item.id}
            renderItem={renderInvoiceItem}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  reportsButton: {
    padding: 8,
  },
  summaryCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  quickAddCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryButton: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  expensesCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  expenseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  expenseContent: {
    flex: 1,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  expenseCategory: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  expenseLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  expenseTime: {
    fontSize: 12,
    color: '#999',
  },
  invoicesCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  invoiceItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceId: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paidBadge: {
    backgroundColor: '#34C759',
  },
  pendingBadge: {
    backgroundColor: '#FF9500',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  invoiceBroker: {
    fontSize: 14,
    color: '#666',
  },
  invoiceDate: {
    fontSize: 12,
    color: '#999',
  },
});

export default FinanceScreen; 