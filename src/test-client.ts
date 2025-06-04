import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join } from 'path';

const PROTO_PATH = join(__dirname, 'proto/cart.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
if (!protoDescriptor.cart || !(protoDescriptor.cart as any).CartService) {
  throw new Error('Failed to load CartService from proto definition');
}

const cartService = (protoDescriptor.cart as any).CartService;

// Create client with connection timeout
const client = new cartService(
  'localhost:5000',
  grpc.credentials.createInsecure(),
  {
    'grpc.keepalive_time_ms': 30000,
    'grpc.keepalive_timeout_ms': 10000,
    'grpc.http2.min_time_between_pings_ms': 10000,
    'grpc.keepalive_permit_without_calls': 1,
  }
);

// Wait for client to be ready
function waitForClient(): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 5);

    client.waitForReady(deadline, (error) => {
      if (error) {
        console.error('Failed to connect to cart service:', error);
        reject(error);
      } else {
        console.log('Connected to cart service successfully');
        resolve();
      }
    });
  });
}

// Helper function for gRPC calls
function makeGrpcCall<T>(method: string, request: any): Promise<T> {
  return new Promise((resolve, reject) => {
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 5);

    if (typeof client[method] !== 'function') {
      reject(new Error(`Method ${method} not found in CartService`));
      return;
    }

    client[method](
      request,
      { deadline },
      (error: grpc.ServiceError | null, response: T) => {
        if (error) {
          console.error(`Error in ${method}:`, {
            code: error.code,
            message: error.message,
            details: error.details
          });
          reject(error);
        } else {
          console.log(`${method} Response:`, JSON.stringify(response, null, 2));
          resolve(response);
        }
      },
    );
  });
}

// Test functions
async function testAddItem() {
  try {
    return await makeGrpcCall('addItem', {
      userId: 'user123',
      item: {
        productId: 'product123',
        quantity: 2,
        price: 29.99,
      },
    });
  } catch (error) {
    console.error('Failed to add item:', error);
    throw error;
  }
}

async function testGetCart() {
  try {
    return await makeGrpcCall('getCart', {
      userId: 'user123',
    });
  } catch (error) {
    console.error('Failed to get cart:', error);
    throw error;
  }
}

async function testUpdateItem() {
  try {
    return await makeGrpcCall('updateItem', {
      userId: 'user123',
      productId: 'product123',
      quantity: 3,
    });
  } catch (error) {
    console.error('Failed to update item:', error);
    throw error;
  }
}

async function testRemoveItem() {
  try {
    return await makeGrpcCall('removeItem', {
      userId: 'user123',
      productId: 'product123',
    });
  } catch (error) {
    console.error('Failed to remove item:', error);
    throw error;
  }
}

async function testClearCart() {
  try {
    return await makeGrpcCall('clearCart', {
      userId: 'user123',
    });
  } catch (error) {
    console.error('Failed to clear cart:', error);
    throw error;
  }
}

// Run tests with proper error handling
async function runTests() {
  console.log('Starting cart service tests...\n');
  
  try {
    // Wait for client to be ready before running tests
    await waitForClient();

    console.log('1. Testing Add Item...');
    await testAddItem();

    console.log('\n2. Testing Get Cart...');
    await testGetCart();

    console.log('\n3. Testing Update Item...');
    await testUpdateItem();

    console.log('\n4. Testing Get Cart after Update...');
    await testGetCart();

    console.log('\n5. Testing Remove Item...');
    await testRemoveItem();

    console.log('\n6. Testing Get Cart after Remove...');
    await testGetCart();

    console.log('\n7. Testing Clear Cart...');
    await testClearCart();

    console.log('\n8. Testing Get Cart after Clear...');
    await testGetCart();

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('\nTest suite failed:', error);
    process.exit(1);
  } finally {
    // Close the client connection
    client.close();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nTest client terminated by user');
  client.close();
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  client.close();
  process.exit(1);
});

runTests(); 