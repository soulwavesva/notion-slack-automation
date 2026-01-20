const { Client } = require('@notionhq/client');

class NotionService {
  constructor() {
    this.notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    this.databaseId = process.env.NOTION_DATABASE_ID;
  }

  async getOverdueTasks() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const database = await this.notion.databases.retrieve({
        database_id: this.databaseId
      });
      
      let checkboxProperty = null;
      let dateProperty = null;
      
      Object.entries(database.properties).forEach(([name, property]) => {
        if (property.type === 'checkbox' && !checkboxProperty) {
          checkboxProperty = name;
        }
        if (property.type === 'date' && name.toLowerCase().includes('due')) {
          dateProperty = name;
        }
      });
      
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: {
          and: [
            {
              property: checkboxProperty,
              checkbox: { equals: false }
            },
            {
              property: dateProperty,
              date: { on_or_before: today }
            }
          ]
        },
        sorts: [{ property: dateProperty, direction: 'ascending' }]
      });

      return response.results.map(page => ({
        id: page.id,
        title: this.extractTitle(page),
        dueDate: this.extractDueDate(page),
        url: page.url,
        priority: 'urgent',
        assignedTo: this.extractAssignedPerson(page)
      }));
      
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      throw error;
    }
  }

  async getUpcomingTasks() {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(today.getDate() + 7);
      
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];
      
      const database = await this.notion.databases.retrieve({
        database_id: this.databaseId
      });
      
      let checkboxProperty = null;
      let dateProperty = null;
      
      Object.entries(database.properties).forEach(([name, property]) => {
        if (property.type === 'checkbox' && !checkboxProperty) {
          checkboxProperty = name;
        }
        if (property.type === 'date' && name.toLowerCase().includes('due')) {
          dateProperty = name;
        }
      });
      
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: {
          and: [
            {
              property: checkboxProperty,
              checkbox: { equals: false }
            },
            {
              property: dateProperty,
              date: { on_or_after: tomorrowStr }
            },
            {
              property: dateProperty,
              date: { on_or_before: sevenDaysStr }
            }
          ]
        },
        sorts: [{ property: dateProperty, direction: 'ascending' }]
      });

      return response.results.map(page => ({
        id: page.id,
        title: this.extractTitle(page),
        dueDate: this.extractDueDate(page),
        url: page.url,
        priority: 'upcoming',
        assignedTo: this.extractAssignedPerson(page)
      }));
      
    } catch (error) {
      console.error('Error fetching upcoming tasks:', error);
      throw error;
    }
  }

  extractTitle(page) {
    const titleProperty = Object.values(page.properties).find(
      prop => prop.type === 'title'
    );
    
    if (titleProperty && titleProperty.title.length > 0) {
      return titleProperty.title[0].plain_text;
    }
    
    return 'Untitled Task';
  }

  extractDueDate(page) {
    const dueDateProperty = page.properties['Due Date'];
    
    if (dueDateProperty && dueDateProperty.date) {
      return dueDateProperty.date.start;
    }
    
    return null;
  }

  extractAssignedPerson(page) {
    const assignedProperty = page.properties['Assigned To'] || page.properties['Assigned to'] || page.properties['Person'] || page.properties['Assign'];
    
    if (assignedProperty && assignedProperty.people && assignedProperty.people.length > 0) {
      const personName = assignedProperty.people[0].name;
      
      if (personName === 'Robert Schok' || (personName.includes('Robert') && personName.includes('Schok'))) {
        return { name: 'ROB', emoji: '👨‍💼', fullName: 'Robert Schok' };
      } else if (personName === 'Samuel Robertson' || (personName.includes('Samuel') && personName.includes('Robertson'))) {
        return { name: 'SAM', emoji: '👨‍💻', fullName: 'Samuel Robertson' };
      } else if (personName === 'Anna Schuster' || (personName.includes('Anna') && personName.includes('Schuster'))) {
        return { name: 'ANNA', emoji: '👩‍💼', fullName: 'Anna Schuster' };
      }
      
      return { name: personName.split(' ')[0].toUpperCase(), emoji: '👤', fullName: personName };
    }
    
    return { name: 'UNASSIGNED', emoji: '❓', fullName: 'Unassigned' };
  }
}

module.exports = { NotionService };