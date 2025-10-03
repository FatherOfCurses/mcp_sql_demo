const mysql = require('mysql2/promise');

async function checkForPolicies() {
  const config = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '12thNight!',
    database: 'lctest'
  };

  try {
    const connection = await mysql.createConnection(config);
    
    // First, let's see what tables exist
    console.log('Checking existing tables...');
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables in database:', tables);
    
    // Look for any table that might contain policies
    const tableNames = tables.map(row => Object.values(row)[0]);
    const policyTables = tableNames.filter(name => 
      name.toLowerCase().includes('policy') || 
      name.toLowerCase().includes('policies')
    );
    
    if (policyTables.length > 0) {
      console.log('\nFound policy-related tables:', policyTables);
      
      // Check each policy table for the newest record
      for (const tableName of policyTables) {
        console.log(`\nChecking table: ${tableName}`);
        
        // First show the structure
        const [structure] = await connection.query(`DESCRIBE ${tableName}`);
        console.log('Table structure:', structure);
        
        // Look for a date/time column to sort by
        const dateColumns = structure.filter(col => 
          col.Type.includes('timestamp') || 
          col.Type.includes('datetime') || 
          col.Field.toLowerCase().includes('created') ||
          col.Field.toLowerCase().includes('updated') ||
          col.Field.toLowerCase().includes('date')
        );
        
        if (dateColumns.length > 0) {
          const dateColumn = dateColumns[0].Field;
          console.log(`Using date column: ${dateColumn}`);
          
          const [newest] = await connection.query(
            `SELECT * FROM ${tableName} ORDER BY ${dateColumn} DESC LIMIT 1`
          );
          
          if (newest.length > 0) {
            console.log('Newest policy:', newest[0]);
          } else {
            console.log('No policies found in this table');
          }
        } else {
          // If no date column, just get the last record by primary key
          const [newest] = await connection.query(
            `SELECT * FROM ${tableName} ORDER BY id DESC LIMIT 1`
          );
          
          if (newest.length > 0) {
            console.log('Latest policy (by ID):', newest[0]);
          } else {
            console.log('No policies found in this table');
          }
        }
      }
    } else {
      console.log('No policy-related tables found. Looking for any tables with policy-like data...');
      
      // Check all tables for any that might contain policy data
      for (const tableName of tableNames) {
        try {
          const [sample] = await connection.query(`SELECT * FROM ${tableName} LIMIT 1`);
          if (sample.length > 0) {
            const columns = Object.keys(sample[0]);
            if (columns.some(col => col.toLowerCase().includes('policy'))) {
              console.log(`\nTable ${tableName} might contain policy data:`, sample[0]);
            }
          }
        } catch (err) {
          console.log(`Error checking table ${tableName}:`, err.message);
        }
      }
    }
    
    await connection.end();
  } catch (error) {
    console.error('Error connecting to database:', error.message);
  }
}

checkForPolicies();